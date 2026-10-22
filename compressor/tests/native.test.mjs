import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeCandidate,NativeUnavailable} from '../native-encode.mjs';
import {MB,suggestVisualTargetMB,makePlan,nativeRefinementBitrate} from '../codec.mjs';

test('Native engine is gated to one-video MP4 with compatible AAC tracks',()=>{
  assert.equal(nativeCandidate('source.mp4',1,['aac']),true);
  assert.equal(nativeCandidate('silent.MP4',1,[]),true);
  assert.equal(nativeCandidate('multi.mp4',2,['aac']),false);
  assert.equal(nativeCandidate('voice.mp4',1,['opus']),false);
  assert.equal(nativeCandidate('archive.mkv',1,['aac']),false);
  assert.equal(nativeCandidate('sound.mp4',1,['aac','aac','aac']),false);
});

test('Visual size suggestion is based on pixels, time and sound and makes no guarantee',()=>{
  const short=suggestVisualTargetMB({duration:60,width:1920,height:1080,fps:30,originalBytes:200*MB,audioTracks:[{kbps:128}]});
  const long=suggestVisualTargetMB({duration:300,width:1920,height:1080,fps:30,originalBytes:200*MB,audioTracks:[{kbps:128}]});
  assert.ok(short>8 && short<100);
  assert.ok(long>short);
  assert.equal(suggestVisualTargetMB({duration:0,width:1920,height:1080}),null);
  assert.ok(suggestVisualTargetMB({duration:60,width:1920,height:1080,fps:30,originalBytes:25*MB})<=25);
});

test('Rate planning continues to reject impossible targets',()=>{
  assert.throws(()=>makePlan({duration:200,targetMB:1,originalBytes:200*MB,width:1920,height:1080,fps:30}),/too small|usable picture/);
  assert.equal(new NativeUnavailable('unavailable').name,'NativeUnavailable');
});

test('Native refinement spends unused video budget only when first pass is fast',()=>{
 const args={targetBytes:600000,outputBytes:462000,videoBps:605000,audioBps:128000,duration:6,elapsedMs:500};
 const next=nativeRefinementBitrate(args);
 assert.ok(next>args.videoBps && next<=args.videoBps*1.65);
 assert.equal(nativeRefinementBitrate({...args,outputBytes:550000}),null,'close enough: keep speed');
 assert.equal(nativeRefinementBitrate({...args,elapsedMs:15000}),null,'long encode: never double work');
 assert.equal(nativeRefinementBitrate({...args,duration:25}),null,'long video: never double the work');
 assert.equal(nativeRefinementBitrate({...args,originalBytes:33*MB}),null,'33 MB source: always single native pass');
 assert.equal(nativeRefinementBitrate({...args,targetBytes:200000}),null,'tiny outputs should not be retried');
 assert.equal(nativeRefinementBitrate({...args,outputBytes:800000}),null,'oversize outputs are not refined');
 assert.equal(nativeRefinementBitrate({...args,audioBps:2000000}),null,'never steal bits reserved for audio');
 assert.equal(nativeRefinementBitrate({...args,videoBps:NaN}),null,'invalid bitrate');
});
