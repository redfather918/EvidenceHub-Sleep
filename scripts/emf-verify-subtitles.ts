// Standalone verification for the EMF subtitle + render fix.
// Bypasses LLM/TTS (uses a silent audio track) so it runs fully offline and
// proves the ffmpeg filtergraph (concat + subtitles) is valid and renders.

import { renderSvgCards, buildAssetSpecs } from "../src/lib/emf/assets";
import { writeAssFile } from "../src/lib/emf/subtitles";
import * as video from "../src/lib/emf/video";

async function main() {
  const item = "kiwi";
  const draft: any = {
    hook: "Eat kiwi before bed?",
    body: [
      "Kiwis are rich in serotonin and antioxidants.",
      "Studies link kiwi to falling asleep faster.",
      "They may improve total sleep time too.",
    ],
    ending: "A small habit for a better night.",
    voice: "A",
  };

  const specs = buildAssetSpecs(item, "TA");
  const written = await renderSvgCards(
    specs,
    { hook: draft.hook, item, evidence: draft.body.slice(0, 2).join(" "), ending: draft.ending },
    process.cwd()
  );
  console.log("[verify] SVG cards written:", written);

  const audioDur = 30; // simulate narration length; silent track will be used
  const ass = await writeAssFile(draft, audioDur, "TEST_kiwi", "output/subtitles");
  console.log("[verify] ASS:", ass);

  const tts: any = { text: "x", status: "silent", audioPath: undefined };
  const manifest = await video.buildRenderManifest(draft, specs, tts, "TEST_kiwi", "output/videos", ass);
  console.log("[verify] FFMPEG CMD:\n" + manifest.ffmpegCommand);

  const res = await video.renderVideoWithFfmpeg(manifest, "output/videos", true);
  console.log("[verify] RENDER:", JSON.stringify(res));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
