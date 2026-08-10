using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace TalentPulseApi.Hubs
{
    public class InterviewHub : Hub
    {
        public async Task JoinSession(string sessionId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);
            await Clients.Group(sessionId).SendAsync("UserJoined", Context.ConnectionId);
        }

        public async Task StreamTranscribing(string sessionId, string partialText)
        {
            await Clients.OthersInGroup(sessionId).SendAsync("ReceivePartialTranscript", partialText);
        }

        public async Task SignalSpeechMetric(string sessionId, int currentWpm, int fillerCount)
        {
            await Clients.OthersInGroup(sessionId).SendAsync("ReceiveSpeechMetric", currentWpm, fillerCount);
        }

        public async Task LeaveSession(string sessionId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, sessionId);
        }
    }
}
