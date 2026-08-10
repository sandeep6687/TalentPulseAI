using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using UglyToad.PdfPig;
using System.IO.Compression;

namespace TalentPulseApi.Services
{
    public interface IResumeParsingService
    {
        Task<string> ExtractTextAsync(IFormFile file);
    }

    public class ResumeParsingService : IResumeParsingService
    {
        public async Task<string> ExtractTextAsync(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                throw new InvalidOperationException("Please choose a resume file first.");
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            await using var stream = file.OpenReadStream();

            return extension switch
            {
                ".txt" or ".md" => await ReadTextAsync(stream),
                ".pdf" => ExtractPdfText(stream),
                ".docx" => ExtractDocxText(stream),
                _ => await ReadTextAsync(stream)
            };
        }

        private static async Task<string> ReadTextAsync(Stream stream)
        {
            using var reader = new StreamReader(stream, leaveOpen: true, detectEncodingFromByteOrderMarks: true);
            return await reader.ReadToEndAsync();
        }

        private static string ExtractPdfText(Stream stream)
        {
            try
            {
                using var memoryStream = new MemoryStream();
                stream.CopyTo(memoryStream);
                var pdfBytes = memoryStream.ToArray();

                using var document = PdfDocument.Open(pdfBytes);
                var builder = new StringBuilder();

                foreach (var page in document.GetPages())
                {
                    var pageText = page.Text;

                    if (string.IsNullOrWhiteSpace(pageText))
                    {
                        var words = page.GetWords();
                        if (words != null && words.Any())
                        {
                            pageText = string.Join(" ", words.Select(w => w.Text));
                        }
                    }

                    if (string.IsNullOrWhiteSpace(pageText) && page.Letters != null)
                    {
                        pageText = string.Join("", page.Letters.Select(l => l.Value));
                    }

                    if (!string.IsNullOrWhiteSpace(pageText))
                    {
                        builder.AppendLine(pageText.Trim());
                    }
                }

                var extracted = builder.ToString().Trim();
                if (!string.IsNullOrWhiteSpace(extracted) && !IsRawPdfOrBinaryData(extracted))
                {
                    return extracted;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"PdfPig extraction error: {ex.Message}");
            }

            return string.Empty;
        }

        private static bool IsRawPdfOrBinaryData(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return false;
            return text.StartsWith("%PDF-") || 
                   text.Contains("/FlateDecode") || 
                   text.Contains("/Length ") || 
                   text.Contains("endobj") || 
                   text.Contains("endstream");
        }

        private static string ExtractDocxText(Stream stream)
        {
            using var archive = new ZipArchive(stream, ZipArchiveMode.Read, leaveOpen: true);
            var documentPart = archive.GetEntry("word/document.xml");
            if (documentPart == null)
            {
                return string.Empty;
            }

            using var reader = new StreamReader(documentPart.Open());
            var xml = reader.ReadToEnd();

            var textMatches = Regex.Matches(xml, @">(.*?)<", RegexOptions.Singleline);
            var builder = new StringBuilder();

            foreach (Match match in textMatches)
            {
                var value = match.Groups[1].Value;
                if (string.IsNullOrWhiteSpace(value))
                {
                    continue;
                }

                value = Regex.Replace(value, "<[^>]+>", string.Empty);
                value = Regex.Replace(value, "&nbsp;", " ");
                value = Regex.Replace(value, "&amp;", "&");
                value = Regex.Replace(value, "&lt;", "<");
                value = Regex.Replace(value, "&gt;", ">");

                if (value.Contains("w:tbl") || value.Contains("w:pPr") || value.Contains("xml") || value.Contains("/w:body"))
                {
                    continue;
                }

                builder.AppendLine(value);
            }

            return builder.ToString().Trim();
        }
    }
}
