import { Test, TestingModule } from '@nestjs/testing';
import { RevokedTokensController } from './revoked-tokens.controller';
import { RevokedTokensService } from './revoked-tokens.service';

describe('RevokedTokensController', () => {
  let controller: RevokedTokensController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RevokedTokensController],
      providers: [RevokedTokensService],
    }).compile();

    controller = module.get<RevokedTokensController>(RevokedTokensController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
