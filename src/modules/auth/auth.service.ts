import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SignupDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async signup(dto: SignupDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already in use');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                name: dto.name,
            },
        });

        const token = this.jwtService.sign({ sub: user.id, email: user.email });
        return {
            success: true,
            status: 201,
            message: 'User registered successfully',
            data: { accessToken: token, user: { id: user.id, email: user.email, name: user.name } },
        };
    }


    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const passwordValid = await bcrypt.compare(dto.password, user.password);

        if (!passwordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const token = this.jwtService.sign({ sub: user.id, email: user.email });
        return {
            success: true,
            status: 200,
            message: 'Login successful',
            data: { accessToken: token, user: { id: user.id, email: user.email, name: user.name } },
        };
    }

}
