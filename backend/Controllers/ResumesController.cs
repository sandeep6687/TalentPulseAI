using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentPulseApi.Data;
using TalentPulseApi.Models;
using TalentPulseApi.Services;
using Microsoft.AspNetCore.Http;

namespace TalentPulseApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ResumesController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IAIEngineService _aiService;
        private readonly IResumeParsingService _resumeParsingService;

        public ResumesController(AppDbContext db, IAIEngineService aiService, IResumeParsingService resumeParsingService)
        {
            _db = db;
            _aiService = aiService;
            _resumeParsingService = resumeParsingService;
        }

        public record AnalyzeRequest(string CandidateName, string CandidateEmail, string ResumeText, string JobTitle, string CompanyName, string JobDescriptionText);

        [HttpPost("upload")]
        public async Task<IActionResult> UploadResume([FromForm] IFormFile file)
        {
            try
            {
                var extractedText = await _resumeParsingService.ExtractTextAsync(file);
                return Ok(new { extractedText, filename = file.FileName });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("analyze")]
        public async Task<IActionResult> AnalyzeResume([FromBody] AnalyzeRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.ResumeText) || string.IsNullOrWhiteSpace(req.JobDescriptionText))
            {
                return BadRequest(new { message = "ResumeText and JobDescriptionText are required." });
            }

            // Find or create User
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.CandidateEmail);
            if (user == null)
            {
                user = new User
                {
                    FullName = string.IsNullOrWhiteSpace(req.CandidateName) ? "Candidate User" : req.CandidateName,
                    Email = string.IsNullOrWhiteSpace(req.CandidateEmail) ? $"candidate_{Guid.NewGuid().ToString()[..6]}@talentpulse.io" : req.CandidateEmail
                };
                _db.Users.Add(user);
                await _db.SaveChangesAsync();
            }

            // Create Resume & JD records
            var resume = new Resume
            {
                UserId = user.UserId,
                FileName = "Uploaded_Resume.txt",
                RawText = req.ResumeText
            };
            _db.Resumes.Add(resume);

            var jd = new JobDescription
            {
                JobTitle = string.IsNullOrWhiteSpace(req.JobTitle) ? "Software Engineer" : req.JobTitle,
                CompanyName = string.IsNullOrWhiteSpace(req.CompanyName) ? "Tech Corp" : req.CompanyName,
                RawText = req.JobDescriptionText
            };
            _db.JobDescriptions.Add(jd);
            await _db.SaveChangesAsync();

            // Run AI ATS Match Analysis
            var atsResult = await _aiService.AnalyzeAtsMatchAsync(req.ResumeText, req.JobDescriptionText);

            var atsAnalysis = new AtsAnalysis
            {
                ResumeId = resume.ResumeId,
                JdId = jd.JdId,
                MatchScore = atsResult.MatchScore,
                MissingKeywordsJson = System.Text.Json.JsonSerializer.Serialize(atsResult.MissingKeywords),
                SkillBreakdownJson = System.Text.Json.JsonSerializer.Serialize(atsResult.SkillBreakdown),
                Summary = atsResult.Summary
            };

            _db.AtsAnalyses.Add(atsAnalysis);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                AtsId = atsAnalysis.AtsId,
                ResumeId = resume.ResumeId,
                JdId = jd.JdId,
                MatchScore = atsResult.MatchScore,
                MissingKeywords = atsResult.MissingKeywords,
                SkillBreakdown = atsResult.SkillBreakdown,
                Summary = atsResult.Summary
            });
        }

        public record GenerateATSRequest(string ResumeText, string JdText, List<string> MissingKeywords);

        [HttpPost("generate-ats")]
        public async Task<IActionResult> GenerateATSResume([FromBody] GenerateATSRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.ResumeText) || string.IsNullOrWhiteSpace(req.JdText))
                return BadRequest(new { message = "ResumeText and JdText are required." });

            var optimizedResume = await _aiService.GenerateATSResumeAsync(req.ResumeText, req.JdText, req.MissingKeywords ?? new List<string>());
            return Ok(new { optimizedResumeText = optimizedResume });
        }
    }
}
