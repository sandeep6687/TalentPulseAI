using Microsoft.EntityFrameworkCore;
using TalentPulseApi.Models;

namespace TalentPulseApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<Resume> Resumes => Set<Resume>();
        public DbSet<JobDescription> JobDescriptions => Set<JobDescription>();
        public DbSet<AtsAnalysis> AtsAnalyses => Set<AtsAnalysis>();
        public DbSet<InterviewSession> InterviewSessions => Set<InterviewSession>();
        public DbSet<InterviewQuestion> InterviewQuestions => Set<InterviewQuestion>();
        public DbSet<CandidateAnswer> CandidateAnswers => Set<CandidateAnswer>();
        public DbSet<FeedbackScorecard> FeedbackScorecards => Set<FeedbackScorecard>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<AtsAnalysis>()
                .HasOne(a => a.Resume)
                .WithMany(r => r.AtsAnalyses)
                .HasForeignKey(a => a.ResumeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<AtsAnalysis>()
                .HasOne(a => a.JobDescription)
                .WithMany(j => j.AtsAnalyses)
                .HasForeignKey(a => a.JdId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<InterviewQuestion>()
                .HasOne(q => q.Session)
                .WithMany(s => s.Questions)
                .HasForeignKey(q => q.SessionId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CandidateAnswer>()
                .HasOne(a => a.Question)
                .WithOne(q => q.Answer)
                .HasForeignKey<CandidateAnswer>(a => a.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<FeedbackScorecard>()
                .HasOne(f => f.Session)
                .WithOne(s => s.Scorecard)
                .HasForeignKey<FeedbackScorecard>(f => f.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
