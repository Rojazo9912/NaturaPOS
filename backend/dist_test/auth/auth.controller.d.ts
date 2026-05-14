import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(_loginDto: LoginDto, user: any): Promise<{
        mfaRequired: boolean;
        userId: any;
        access_token?: undefined;
        user?: undefined;
    } | {
        access_token: string;
        user: {
            id: any;
            name: any;
            email: any;
            role: any;
            organizationId: any;
            branchId: any;
        };
        mfaRequired?: undefined;
        userId?: undefined;
    }>;
    generateMfa(user: any): Promise<{
        secret: any;
        qrCodeDataURL: string;
    }>;
    enableMfa(user: any, body: {
        code: string;
        secret: string;
    }): Promise<{
        id: string;
        email: string;
        organizationId: string;
        branchId: string | null;
        passwordHash: string;
        name: string;
        phone: string | null;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        mfaEnabled: boolean;
        mfaSecret: string | null;
        riskScore: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    mfaLogin(body: {
        userId: string;
        code: string;
    }): Promise<{
        mfaRequired: boolean;
        userId: any;
        access_token?: undefined;
        user?: undefined;
    } | {
        access_token: string;
        user: {
            id: any;
            name: any;
            email: any;
            role: any;
            organizationId: any;
            branchId: any;
        };
        mfaRequired?: undefined;
        userId?: undefined;
    }>;
    getProfile(user: any): Promise<{
        organization: {
            name: string;
            slug: string;
            plan: import(".prisma/client").$Enums.Plan;
        };
        branch: {
            name: string;
            address: string;
        };
        id: string;
        email: string;
        organizationId: string;
        branchId: string;
        name: string;
        phone: string;
        role: import(".prisma/client").$Enums.Role;
        riskScore: number;
        createdAt: Date;
    }>;
}
