using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentPulseApi.Data;
using TalentPulseApi.Models;
using TalentPulseApi.Services;

namespace TalentPulseApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InterviewsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IAIEngineService _aiService;

        public InterviewsController(AppDbContext db, IAIEngineService aiService)
        {
            _db = db;
            _aiService = aiService;
        }

        public record ScheduleRequest(Guid AtsId, string RoleType, string DifficultyLevel);
        public record EvaluateAnswerRequest(Guid QuestionId, string TranscribedText, int DurationSeconds, int FillerWordCount);

        [HttpPost("schedule")]
        public async Task<IActionResult> ScheduleInterview([FromBody] ScheduleRequest req)
        {
            var ats = await _db.AtsAnalyses
                .Include(a => a.Resume)
                .Include(a => a.JobDescription)
                .FirstOrDefaultAsync(a => a.AtsId == req.AtsId);

            if (ats == null || ats.Resume == null || ats.JobDescription == null)
            {
                return NotFound(new { message = "ATS Analysis session not found." });
            }

            var missingSkills = JsonSerializer.Deserialize<List<string>>(ats.MissingKeywordsJson) ?? new List<string>();

            // Generate tailored questions via AI
            var questionDtos = await _aiService.GenerateTailoredQuestionsAsync(
                ats.Resume.RawText,
                ats.JobDescription.RawText,
                missingSkills,
                ats.JobDescription.JobTitle
            );

            var session = new InterviewSession
            {
                UserId = ats.Resume.UserId,
                AtsId = ats.AtsId,
                Status = "SCHEDULED",
                RoleType = string.IsNullOrWhiteSpace(req.RoleType) ? ats.JobDescription.JobTitle : req.RoleType,
                DifficultyLevel = string.IsNullOrWhiteSpace(req.DifficultyLevel) ? "Intermediate" : req.DifficultyLevel,
                ScheduledAt = DateTime.UtcNow
            };

            _db.InterviewSessions.Add(session);
            await _db.SaveChangesAsync();

            foreach (var q in questionDtos)
            {
                var questionEntity = new InterviewQuestion
                {
                    SessionId = session.SessionId,
                    OrderIndex = q.OrderIndex,
                    Category = q.Category,
                    QuestionText = q.QuestionText,
                    TargetSkill = q.TargetSkill
                };
                _db.InterviewQuestions.Add(questionEntity);
            }

            await _db.SaveChangesAsync();

            return Ok(new
            {
                SessionId = session.SessionId,
                Status = session.Status,
                RoleType = session.RoleType,
                DifficultyLevel = session.DifficultyLevel,
                QuestionsCount = questionDtos.Count,
                Questions = questionDtos
            });
        }

        [HttpGet("session/{sessionId}")]
        public async Task<IActionResult> GetSession(Guid sessionId)
        {
            var session = await _db.InterviewSessions
                .Include(s => s.Questions)
                .ThenInclude(q => q.Answer)
                .Include(s => s.Scorecard)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session == null) return NotFound();

            return Ok(session);
        }

        [HttpPost("answer")]
        public async Task<IActionResult> SubmitAnswer([FromBody] EvaluateAnswerRequest req)
        {
            var question = await _db.InterviewQuestions
                .Include(q => q.Session)
                .FirstOrDefaultAsync(q => q.QuestionId == req.QuestionId);

            if (question == null) return NotFound(new { message = "Question not found." });

            var eval = await _aiService.EvaluateAnswerAsync(
                question.QuestionText,
                req.TranscribedText,
                req.DurationSeconds,
                req.FillerWordCount
            );

            var candidateAnswer = new CandidateAnswer
            {
                QuestionId = question.QuestionId,
                TranscribedText = req.TranscribedText,
                DurationSeconds = req.DurationSeconds,
                FillerWordCount = req.FillerWordCount,
                Score = eval.Score,
                Strengths = eval.Strengths,
                Weaknesses = eval.Weaknesses,
                IdealAnswerSample = eval.IdealAnswerSample
            };

            _db.CandidateAnswers.Add(candidateAnswer);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                AnswerId = candidateAnswer.AnswerId,
                Score = eval.Score,
                Strengths = eval.Strengths,
                Weaknesses = eval.Weaknesses,
                IdealAnswerSample = eval.IdealAnswerSample
            });
        }

        [HttpPost("session/{sessionId}/complete")]
        public async Task<IActionResult> CompleteSession(Guid sessionId)
        {
            var session = await _db.InterviewSessions
                .Include(s => s.Questions)
                .ThenInclude(q => q.Answer)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session == null) return NotFound();

            var pairs = session.Questions
                .Where(q => q.Answer != null)
                .Select(q => new QuestionAnswerPairDto(
                    q.QuestionText,
                    q.TargetSkill,
                    q.Answer!.TranscribedText,
                    q.Answer.DurationSeconds,
                    q.Answer.FillerWordCount
                )).ToList();

            var scorecardDto = await _aiService.GenerateSessionScorecardAsync(pairs);

            double overallScore = Math.Round((scorecardDto.TechnicalDepth + scorecardDto.Communication + scorecardDto.ProblemSolving + scorecardDto.StarMethod + scorecardDto.Confidence) / 5.0, 1);

            session.Status = "COMPLETED";
            session.OverallScore = overallScore;
            session.CompletedAt = DateTime.UtcNow;

            var scorecard = new FeedbackScorecard
            {
                SessionId = session.SessionId,
                TechnicalDepthScore = scorecardDto.TechnicalDepth,
                CommunicationScore = scorecardDto.Communication,
                ProblemSolvingScore = scorecardDto.ProblemSolving,
                StarMethodScore = scorecardDto.StarMethod,
                ConfidenceScore = scorecardDto.Confidence,
                ActionPlanJson = JsonSerializer.Serialize(scorecardDto.ActionPlan)
            };

            _db.FeedbackScorecards.Add(scorecard);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                SessionId = session.SessionId,
                OverallScore = overallScore,
                Scorecard = scorecardDto
            });
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetInterviewHistory([FromQuery] Guid? userId)
        {
            var query = _db.InterviewSessions
                .Include(s => s.Questions)
                .ThenInclude(q => q.Answer)
                .Include(s => s.Scorecard)
                .AsQueryable();

            if (userId.HasValue && userId.Value != Guid.Empty)
            {
                query = query.Where(s => s.UserId == userId.Value);
            }

            var sessions = await query
                .OrderByDescending(s => s.ScheduledAt)
                .Take(20)
                .ToListAsync();

            return Ok(sessions);
        }
    }
}
