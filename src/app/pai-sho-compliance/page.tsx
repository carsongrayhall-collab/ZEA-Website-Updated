import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pai Sho Mobile — Privacy, deletion & disclosures | ZEA Brokers',
  description: 'Data practices, deletion requests, third-party services and licensing disclosures for Pai Sho Mobile.',
};

export default function PaiShoCompliance() {
  return <main className="mx-auto max-w-3xl px-6 py-12 text-base leading-8 [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-2xl [&_p]:mb-4 [&_a]:underline [&_a]:underline-offset-4">
    <a href="/">ZEA Brokers</a>
    <h1 className="mb-4 mt-8 text-4xl leading-tight">Pai Sho Mobile: privacy &amp; data disclosures</h1>
    <p>Prepared November 6, 2026. This page describes the reviewed development app and archive. It is not a certification of Google Play approval. Release-specific retention, account-deletion and provider details must be confirmed before it is used as the final release privacy policy.</p>
    <nav aria-label="Page contents" className="flex flex-wrap gap-x-6 gap-y-2"><a href="#data">Data practices</a><a href="#deletion">Request deletion</a><a href="#services">Services</a><a href="#licenses">Licenses</a></nav>
    <h2 id="data">Local play and optional uploads</h2>
    <p>Pai Sho Mobile stores games, moves, results, preferences and cached artwork on your device. Local play can be used without signing in or sharing games. Online sessions may store cookies and session information on the device.</p>
    <p>When you approve automatic sharing, completed game records are sent to the ZEA Broker archive for game review. Records can include moves, results, game identifiers, timestamps, initial board state and player names or identifiers where present. Manual synchronization can also upload unfinished games. Account passwords are not included in these game uploads.</p>
    <p>Automatic sharing is optional and can be changed in Settings. Turning it off stops future automatic sharing; it does not erase previous uploads. Review the destination before manually synchronizing. Do not include private information in player names or game records.</p>
    <h2 id="services">Services and security</h2>
    <p>The reviewed archive uses private Vercel Blob storage and an administrator-authorized dashboard. Network and hosting providers receive connection information, such as IP addresses, when delivering requests. HTTPS protects supported transfers in transit; no system can guarantee absolute security.</p>
    <p>Online authentication and matches use <a href="https://skudpaisho.com/">The Garden Gate</a>. That service processes online account and match information separately from the ZEA game archive. Optional artwork requests contact <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub</a>. These services have their own data practices.</p>
    <p>This website includes Vercel Analytics through its shared layout. Visiting this page is distinct from playing locally in the app. See <a href="https://vercel.com/docs/analytics/privacy-policy">Vercel Web Analytics privacy information</a>. The reviewed Android manifest requests Internet access; it does not request location, contacts, microphone or camera permissions.</p>
    <h2 id="deletion">Request access or deletion</h2>
    <p>For ZEA archive records, email <a href="mailto:pai-sho@zeabroker.com?subject=Pai%20Sho%20access%20or%20deletion%20request">pai-sho@zeabroker.com</a> with the subject “Pai Sho access or deletion request”. Include your game IDs, player name and approximate upload dates, and say whether you request a copy or deletion of your records. Do not send passwords, private capture URLs or dashboard keys. This request route can be used without installing the app.</p>
    <p>We may need enough information to verify which records concern you and protect other players. The release retention requirement is 30 days. The reviewed archive does not yet implement automatic expiry of game records, so that limit is not currently guaranteed. Before release, deletion must be enforced for archive data and the scope of provider log and backup retention must be verified.</p>
    <p>Clearing local games or Android app storage removes local records, not archive copies or your Garden Gate account. Garden Gate account deletion must be handled through that service. A verified end-to-end account-deletion route is still required before releasing an app experience that enables account creation. Revoking an upload link prevents further use of that link; it does not delete stored games.</p>
    <h2>Purpose, choices and privacy rights</h2>
    <p>The disclosed purpose of optional archive uploads is game review. Enabling game sharing must not be treated as separate permission for AI training or unrelated uses. Additional purposes require their own assessment and disclosures before use.</p>
    <p>Depending on your location, you may have rights to access, correct, erase, restrict or object to processing, receive a portable copy, withdraw consent, or complain to a data protection authority. Contact the address above to raise a privacy request. Withdrawal does not undo processing already performed lawfully.</p>
    <p>The intended age audience, legal bases, international processing safeguards and applicable provider retention must be finalized for the intended release markets. This development disclosure does not establish compliance with children’s privacy laws or Google Play Families requirements.</p>
    <h2 id="licenses">Attribution and service terms</h2>
    <p>Pai Sho Mobile is an unofficial client and is not affiliated with or endorsed by Nickelodeon or the owners of Avatar. Third-party names identify their respective services; they do not imply endorsement.</p>
    <p>The app incorporates <a href="https://github.com/thejambi/SkudPaiSho">SkudPaiSho by thejambi</a>. The mobile project identifies its derivative code as GPL-3.0-only. Distribution must preserve applicable notices and provide complete corresponding source for the distributed version. Artwork rights and credits must be checked separately. An attribution or non-affiliation statement does not grant permission to use an asset.</p>
    <p>Online features depend on third-party availability and supported rulesets. Keep copies of important game records. Nothing on this page limits mandatory consumer or privacy rights. Material changes to these disclosures should be dated and reflected in the app before changed processing begins.</p>
  </main>;
}

