using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentPulseApi.Models
{
    public class User
    {
        [Key]
        public Guid UserId { get; set; } = Guid.NewGuid();
        [Required, MaxLength(100)]
        public string FullName { get; set; } = string.Empty;
        [Required, MaxLength(150)]
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string PasswordSalt { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Resume> Resumes { get; set; } = new List<Resume>();
        public ICollection<InterviewSession> InterviewSessions { get; set; } = new List<InterviewSession>();
    }

    public class Resume
    {
        [Key]
        public Guid ResumeId { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        [Required, MaxLength(255)]
        public string FileName { get; set; } = string.Empty;
        public string RawText { get; set; } = string.Empty;
        public string ParsedSkillsJson { get; set; } = "[]";
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("UserId")]
        public User? User { get; set; }
        public ICollection<AtsAnalysis> AtsAnalyses { get; set; } = new List<AtsAnalysis>();
    }

    public class JobDescription
    {
        [Key]
        public Guid JdId { get; set; } = Guid.NewGuid();
        [Required, MaxLength(150)]
        public string JobTitle { get; set; } = string.Empty;
        [MaxLength(150)]
        public string CompanyName { get; set; } = string.Empty;
        public string RawText { get; set; } = string.Empty;
        public string RequiredSkillsJson { get; set; } = "[]";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<AtsAnalysis> AtsAnalyses { get; set; } = new List<AtsAnalysis>();
    }

    public class AtsAnalysis
    {
        [Key]
        public Guid AtsId { get; set; } = Guid.NewGuid();
        public Guid ResumeId { get; set; }
        public Guid JdId { get; set; }
        public int MatchScore { get; set; }
        public string MissingKeywordsJson { get; set; } = "[]";
        public string SkillBreakdownJson { get; set; } = "{}";
        public string Summary { get; set; } = string.Empty;
        public DateTime AnalyzedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("ResumeId")]
        public Resume? Resume { get; set; }
        [ForeignKey("JdId")]
        public JobDescription? JobDescription { get; set; }
    }

    public class InterviewSession
    {
        [Key]
        public Guid SessionId { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        public Guid AtsId { get; set; }
        [MaxLength(50)]
        public string Status { get; set; } = "SCHEDULED"; // SCHEDULED, IN_PROGRESS, COMPLETED
        public string RoleType { get; set; } = "Software Engineer";
        public string DifficultyLevel { get; set; } = "Intermediate";
        public double OverallScore { get; set; } = 0.0;
        public DateTime ScheduledAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }

        [ForeignKey("UserId")]
        public User? User { get; set; }
        [ForeignKey("AtsId")]
        public AtsAnalysis? AtsAnalysis { get; set; }
        public ICollection<InterviewQuestion> Questions { get; set; } = new List<InterviewQuestion>();
        public FeedbackScorecard? Scorecard { get; set; }
    }

    public class InterviewQuestion
    {
        [Key]
        public Guid QuestionId { get; set; } = Guid.NewGuid();
        public Guid SessionId { get; set; }
        public int OrderIndex { get; set; }
        public string Category { get; set; } = "TECHNICAL"; // TECHNICAL, BEHAVIORAL, ARCHITECTURE
        public string QuestionText { get; set; } = string.Empty;
        public string TargetSkill { get; set; } = string.Empty;

        [ForeignKey("SessionId")]
        public InterviewSession? Session { get; set; }
        public CandidateAnswer? Answer { get; set; }
    }

    public class CandidateAnswer
    {
        [Key]
        public Guid AnswerId { get; set; } = Guid.NewGuid();
        public Guid QuestionId { get; set; }
        public string TranscribedText { get; set; } = string.Empty;
        public int DurationSeconds { get; set; }
        public int FillerWordCount { get; set; }
        public double Score { get; set; }
        public string Strengths { get; set; } = string.Empty;
        public string Weaknesses { get; set; } = string.Empty;
        public string IdealAnswerSample { get; set; } = string.Empty;

        [ForeignKey("QuestionId")]
        public InterviewQuestion? Question { get; set; }
    }

    public class FeedbackScorecard
    {
        [Key]
        public Guid ScorecardId { get; set; } = Guid.NewGuid();
        public Guid SessionId { get; set; }
        public double TechnicalDepthScore { get; set; }
        public double CommunicationScore { get; set; }
        public double ProblemSolvingScore { get; set; }
        public double StarMethodScore { get; set; }
        public double ConfidenceScore { get; set; }
        public string ActionPlanJson { get; set; } = "[]";
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("SessionId")]
        public InterviewSession? Session { get; set; }
    }
}
