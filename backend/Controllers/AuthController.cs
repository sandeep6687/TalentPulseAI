using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentPulseApi.Data;
using TalentPulseApi.Models;
using TalentPulseApi.Services;

namespace TalentPulseApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IAuthService _auth;

        public AuthController(AppDbContext db, IAuthService auth)
        {
            _db = db;
            _auth = auth;
        }

        public record RegisterRequest(string FullName, string Email, string Password);
        public record LoginRequest(string Email, string Password);

        // POST /api/auth/register
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest req)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(req.FullName) ||
                    string.IsNullOrWhiteSpace(req.Email) ||
                    string.IsNullOrWhiteSpace(req.Password))
                    return BadRequest(new { message = "All fields are required." });

                if (req.Password.Length < 6)
                    return BadRequest(new { message = "Password must be at least 6 characters." });

                var existing = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Email.ToLower().Trim());
                if (existing != null)
                    return Conflict(new { message = "An account with this email already exists." });

                var hash = _auth.HashPassword(req.Password);

                var user = new User
                {
                    FullName = req.FullName.Trim(),
                    Email = req.Email.ToLower().Trim(),
                    PasswordHash = hash
                };

                _db.Users.Add(user);
                await _db.SaveChangesAsync();

                var token = _auth.GenerateJwt(user);
                SetAuthCookie(token);

                return Ok(new
                {
                    userId = user.UserId,
                    fullName = user.FullName,
                    email = user.Email,
                    token = token,
                    message = "Account created successfully."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Registration error: " + ex.Message });
            }
        }

        // POST /api/auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                    return BadRequest(new { message = "Email and password are required." });

                var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Email.ToLower().Trim());
                if (user == null || !_auth.VerifyPassword(req.Password, user.PasswordHash))
                    return Unauthorized(new { message = "Invalid email or password." });

                var token = _auth.GenerateJwt(user);
                SetAuthCookie(token);

                return Ok(new
                {
                    userId = user.UserId,
                    fullName = user.FullName,
                    email = user.Email,
                    token = token
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Login error: " + ex.Message });
            }
        }

        // POST /api/auth/logout
        [HttpPost("logout")]
        public IActionResult Logout()
        {
            Response.Cookies.Delete("tp_auth", new CookieOptions
            {
                HttpOnly = true,
                SameSite = SameSiteMode.None,
                Secure = true
            });
            return Ok(new { message = "Logged out." });
        }

        // GET /api/auth/me
        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
                           ?? User.FindFirst("sub");
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized(new { message = "Not authenticated." });

            var user = await _db.Users.FindAsync(userId);
            if (user == null) return Unauthorized(new { message = "User not found." });

            return Ok(new { userId = user.UserId, fullName = user.FullName, email = user.Email });
        }

        private void SetAuthCookie(string token)
        {
            Response.Cookies.Append("tp_auth", token, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Expires = DateTimeOffset.UtcNow.AddHours(24),
                Path = "/"
            });
        }
    }
}
