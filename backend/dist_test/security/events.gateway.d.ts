import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    emitAlert(orgId: string, alert: any): void;
    emitOrder(orgId: string, order: any): void;
    handleJoinOrg(client: Socket, orgId: string): {
        event: string;
        data: string;
    };
}
