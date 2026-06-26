using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace SolarPaygo.Api.Hubs
{
    public class DashboardHub : Hub
    {
        // Clients can join a specific group based on their HardwareId so we can target them
        public async Task SubscribeToSystem(string hardwareId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, hardwareId);
        }

        public async Task UnsubscribeFromSystem(string hardwareId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, hardwareId);
        }
    }
}
