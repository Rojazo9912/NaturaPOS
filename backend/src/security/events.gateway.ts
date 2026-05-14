import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Helper to emit events from services
  emitAlert(orgId: string, alert: any) {
    this.server.to(`org_${orgId}`).emit('risk_alert', alert);
  }

  emitOrder(orgId: string, order: any) {
    this.server.to(`org_${orgId}`).emit('new_order', order);
  }

  @SubscribeMessage('join_org')
  handleJoinOrg(client: Socket, orgId: string) {
    client.join(`org_${orgId}`);
    return { event: 'joined', data: orgId };
  }
}
