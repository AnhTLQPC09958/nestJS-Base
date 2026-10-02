import { Test, TestingModule } from '@nestjs/testing';
import { RevokedTokensService } from './revoked-tokens.service';

describe('RevokedTokensService', () => {
  let service: RevokedTokensService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RevokedTokensService],
    }).compile();

    service = module.get<RevokedTokensService>(RevokedTokensService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
