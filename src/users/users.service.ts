import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByAuthId(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
