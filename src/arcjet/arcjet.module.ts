import { Global, Module } from '@nestjs/common';
import arcjet, { shield, detectBot, fixedWindow } from '@arcjet/node';

export const ARCJET = 'ARCJET';

export type ArcjetClient = ReturnType<typeof arcjet>;

// Initialize the Arcjet client directly once as a raw singleton instance 
// so that @nestjs/observe's dependency injection wrapper never proxies it.
export const rawArcjetClient = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({ mode: 'LIVE' }),
    detectBot({ mode: 'LIVE', allow: [] }),
    fixedWindow({ mode: 'LIVE', window: '1m', max: 60 }),
  ],
});

@Global()
@Module({
  providers: [
    {
      provide: ARCJET,
      useValue: rawArcjetClient, // Use a direct value instead of a factory function
    },
  ],
  exports: [ARCJET],
})
export class ArcjetModule {}