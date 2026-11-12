// Per case: digest = SHA-256(serializeTrack(generateTrack(params))) (as in ../PROTOCOL.md);
// contentDigest = SHA-256(canonicalStringify(parsed document without `integrity` and `generator`)), recomputed here
// with the subject's own canonicalStringify and sha256 (the definition of integrity.contentDigest in src/schema.ts,
// applied to either version's document). embeddedOk = whether the document's own integrity.contentDigest equals it (null if absent).
import { CASES } from '../cases.mjs';

export function measure(g, version) {
  const stamps = new Set(); // generator.version read from the documents themselves
  const cases = CASES.map(c => {
    try {
      const json = g.serializeTrack(g.generateTrack(c.params));
      const { integrity, generator, ...content } = JSON.parse(json);
      stamps.add(generator && generator.version);
      const contentDigest = g.sha256(g.canonicalStringify(content));
      return { id: c.id, digest: g.sha256(json), contentDigest,
        embeddedOk: integrity.contentDigest === undefined ? null : integrity.contentDigest === contentDigest };
    } catch (e) {
      const t = 'THROW:' + (e && e.name || 'Error');
      return { id: c.id, digest: t, contentDigest: t, embeddedOk: null };
    }
  });
  return { generatorVersion: version, documentStamps: [...stamps].sort(), selfTest: g.sha256('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', cases };
}
