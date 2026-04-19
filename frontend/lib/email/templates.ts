// Quiz-native email templates rebuilt as Block[] arrays. Each template is
// designed around a specific moment in the quiz lead-gen lifecycle and
// relies on merge tags that only a quiz funnel can populate. Renders
// through renderBlocks(BrandKit, MergeContext).

import type { EmailTemplate, Block, SiteType } from './blocks';

// --- Inline SVG hero illustrations -----------------------------------------
// Rich, modern illustrations with layered gradients and organic shapes.
// Each is 1200x500 full-bleed. Uses brand teal (#0D7377) as primary accent.

const HERO_POST_QUIZ = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="pq1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0FDFA"/><stop offset="1" stop-color="#E0F2FE"/></linearGradient><linearGradient id="pq2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0D7377"/><stop offset="1" stop-color="#065F63"/></linearGradient></defs><rect width="1200" height="500" fill="url(#pq1)"/><circle cx="1000" cy="100" r="280" fill="#0D7377" opacity="0.06"/><circle cx="1080" cy="400" r="180" fill="#0D7377" opacity="0.04"/><circle cx="200" cy="420" r="120" fill="#0D7377" opacity="0.05"/><g transform="translate(100 80)"><rect width="480" height="340" rx="24" fill="#FFFFFF" filter="drop-shadow(0 8px 32px rgba(0,0,0,0.08))"/><rect x="24" y="24" width="432" height="180" rx="16" fill="url(#pq2)"/><circle cx="380" cy="90" r="60" fill="#FFFFFF" opacity="0.1"/><circle cx="400" cy="140" r="40" fill="#FFFFFF" opacity="0.08"/><text x="60" y="90" font-family="Inter, sans-serif" font-size="14" font-weight="600" fill="#FFFFFF" opacity="0.7" letter-spacing="3">YOUR RESULT</text><text x="60" y="130" font-family="Inter, sans-serif" font-size="32" font-weight="800" fill="#FFFFFF">Is Ready</text><text x="60" y="168" font-family="Inter, sans-serif" font-size="14" fill="#FFFFFF" opacity="0.8">Personalized just for you</text><rect x="40" y="228" width="200" height="12" rx="6" fill="#0D7377" opacity="0.15"/><rect x="40" y="252" width="320" height="8" rx="4" fill="#1A1A1A" opacity="0.08"/><rect x="40" y="272" width="280" height="8" rx="4" fill="#1A1A1A" opacity="0.06"/><rect x="40" y="300" width="140" height="44" rx="22" fill="#0D7377"/><text x="110" y="328" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="#FFFFFF">View Results</text></g><g transform="translate(660 120)"><rect width="420" height="120" rx="16" fill="#FFFFFF" filter="drop-shadow(0 4px 16px rgba(0,0,0,0.06))"/><circle cx="60" cy="60" r="32" fill="#0D7377" opacity="0.12"/><path d="M48 60 L56 68 L72 52" stroke="#0D7377" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="110" y="30" width="160" height="10" rx="5" fill="#0D7377"/><rect x="110" y="52" width="260" height="8" rx="4" fill="#1A1A1A" opacity="0.12"/><rect x="110" y="72" width="220" height="8" rx="4" fill="#1A1A1A" opacity="0.08"/></g><g transform="translate(660 270)"><rect width="200" height="150" rx="16" fill="#FFFFFF" filter="drop-shadow(0 4px 16px rgba(0,0,0,0.06))"/><text x="100" y="50" text-anchor="middle" font-family="Inter, sans-serif" font-size="40" font-weight="800" fill="#0D7377">95</text><text x="100" y="74" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="#6B7280" letter-spacing="2">MATCH SCORE</text><rect x="30" y="96" width="140" height="6" rx="3" fill="#E5E7EB"/><rect x="30" y="96" width="120" height="6" rx="3" fill="#0D7377"/><rect x="30" y="114" width="140" height="6" rx="3" fill="#E5E7EB"/><rect x="30" y="114" width="100" height="6" rx="3" fill="#0D7377" opacity="0.6"/></g><g transform="translate(890 270)"><rect width="200" height="150" rx="16" fill="#0D7377" filter="drop-shadow(0 4px 16px rgba(13,115,119,0.2))"/><text x="100" y="50" text-anchor="middle" font-family="Inter, sans-serif" font-size="40" font-weight="800" fill="#FFFFFF">4.9</text><text x="100" y="74" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF" opacity="0.7" letter-spacing="2">RATING</text><g transform="translate(40 94)"><polygon points="12,0 15,9 24,9 17,14 19,24 12,18 5,24 7,14 0,9 9,9" fill="#FCD34D" transform="scale(0.7)"/><polygon points="12,0 15,9 24,9 17,14 19,24 12,18 5,24 7,14 0,9 9,9" fill="#FCD34D" transform="translate(22 0) scale(0.7)"/><polygon points="12,0 15,9 24,9 17,14 19,24 12,18 5,24 7,14 0,9 9,9" fill="#FCD34D" transform="translate(44 0) scale(0.7)"/><polygon points="12,0 15,9 24,9 17,14 19,24 12,18 5,24 7,14 0,9 9,9" fill="#FCD34D" transform="translate(66 0) scale(0.7)"/><polygon points="12,0 15,9 24,9 17,14 19,24 12,18 5,24 7,14 0,9 9,9" fill="#FCD34D" transform="translate(88 0) scale(0.7)"/></g></g></svg>`;

const HERO_OUTCOME = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="oc1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ECFDF5"/><stop offset="1" stop-color="#F0FDFA"/></linearGradient><linearGradient id="oc2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0D7377"/><stop offset="1" stop-color="#047857"/></linearGradient></defs><rect width="1200" height="500" fill="url(#oc1)"/><circle cx="600" cy="250" r="240" fill="#0D7377" opacity="0.04"/><circle cx="600" cy="250" r="180" fill="#0D7377" opacity="0.06"/><g transform="translate(120 60)"><rect width="280" height="380" rx="20" fill="#FFFFFF" filter="drop-shadow(0 8px 24px rgba(0,0,0,0.08))"/><rect x="20" y="20" width="240" height="160" rx="12" fill="url(#oc2)"/><circle cx="200" cy="60" r="50" fill="#FFFFFF" opacity="0.1"/><path d="M100 70 L120 50 L140 70 L130 70 L130 110 L110 110 L110 70Z" fill="#FFFFFF" opacity="0.25"/><rect x="30" y="200" width="120" height="10" rx="5" fill="#0D7377"/><rect x="30" y="222" width="220" height="8" rx="4" fill="#1A1A1A" opacity="0.1"/><rect x="30" y="242" width="180" height="8" rx="4" fill="#1A1A1A" opacity="0.08"/><rect x="30" y="280" width="100" height="36" rx="18" fill="#0D7377"/><text x="80" y="304" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#FFFFFF">Start</text><rect x="30" y="336" width="60" height="8" rx="4" fill="#0D7377" opacity="0.15"/><rect x="100" y="336" width="60" height="8" rx="4" fill="#0D7377" opacity="0.15"/><rect x="170" y="336" width="60" height="8" rx="4" fill="#0D7377" opacity="0.15"/></g><g transform="translate(460 60)"><rect width="280" height="380" rx="20" fill="#FFFFFF" filter="drop-shadow(0 8px 24px rgba(0,0,0,0.08))"/><rect x="20" y="20" width="240" height="160" rx="12" fill="#065F63"/><circle cx="50" cy="120" r="40" fill="#FFFFFF" opacity="0.08"/><circle cx="200" cy="40" r="30" fill="#FFFFFF" opacity="0.06"/><rect x="30" y="200" width="140" height="10" rx="5" fill="#0D7377"/><rect x="30" y="222" width="200" height="8" rx="4" fill="#1A1A1A" opacity="0.1"/><rect x="30" y="242" width="160" height="8" rx="4" fill="#1A1A1A" opacity="0.08"/><rect x="30" y="280" width="100" height="36" rx="18" fill="#0D7377"/><text x="80" y="304" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#FFFFFF">Get it</text><rect x="30" y="336" width="60" height="8" rx="4" fill="#0D7377" opacity="0.15"/><rect x="100" y="336" width="60" height="8" rx="4" fill="#0D7377" opacity="0.15"/><rect x="170" y="336" width="60" height="8" rx="4" fill="#0D7377" opacity="0.15"/></g><g transform="translate(800 60)"><rect width="280" height="380" rx="20" fill="#FFFFFF" filter="drop-shadow(0 8px 24px rgba(0,0,0,0.08))"/><rect x="20" y="20" width="240" height="160" rx="12" fill="#0D7377" opacity="0.9"/><circle cx="120" cy="80" r="36" fill="#FFFFFF" opacity="0.15"/><path d="M108 68 L108 92 L128 80Z" fill="#FFFFFF" opacity="0.5"/><rect x="30" y="200" width="160" height="10" rx="5" fill="#0D7377"/><rect x="30" y="222" width="210" height="8" rx="4" fill="#1A1A1A" opacity="0.1"/><rect x="30" y="242" width="170" height="8" rx="4" fill="#1A1A1A" opacity="0.08"/><rect x="30" y="280" width="100" height="36" rx="18" fill="#0D7377"/><text x="80" y="304" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#FFFFFF">Book</text><rect x="30" y="336" width="60" height="8" rx="4" fill="#0D7377" opacity="0.15"/><rect x="100" y="336" width="60" height="8" rx="4" fill="#0D7377" opacity="0.15"/><rect x="170" y="336" width="60" height="8" rx="4" fill="#0D7377" opacity="0.15"/></g><text x="600" y="480" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="#0D7377" opacity="0.5" letter-spacing="3">PICKED FOR YOUR RESULT</text></svg>`;

const HERO_NURTURE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="nr1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F8FAFC"/><stop offset="1" stop-color="#F0FDFA"/></linearGradient></defs><rect width="1200" height="500" fill="url(#nr1)"/><circle cx="100" cy="400" r="200" fill="#0D7377" opacity="0.03"/><circle cx="1100" cy="100" r="200" fill="#0D7377" opacity="0.03"/><g transform="translate(100 60)"><rect width="600" height="380" rx="24" fill="#FFFFFF" filter="drop-shadow(0 8px 32px rgba(0,0,0,0.06))"/><rect x="32" y="32" width="536" height="4" rx="2" fill="#E5E7EB"/><rect x="32" y="32" width="360" height="4" rx="2" fill="#0D7377"/><text x="32" y="76" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="#0D7377" letter-spacing="2">DAY 3 OF YOUR JOURNEY</text><text x="32" y="116" font-family="Inter, sans-serif" font-size="28" font-weight="800" fill="#1A1A1A">What usually works</text><text x="32" y="146" font-family="Inter, sans-serif" font-size="15" fill="#6B7280">Based on what you told us about your goals</text><rect x="32" y="176" width="536" height="1" fill="#E5E7EB"/><g transform="translate(32 200)"><circle cx="16" cy="16" r="16" fill="#0D7377" opacity="0.1"/><text x="16" y="21" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="#0D7377">1</text><rect x="44" y="6" width="200" height="10" rx="5" fill="#1A1A1A" opacity="0.12"/><rect x="44" y="22" width="320" height="7" rx="3.5" fill="#1A1A1A" opacity="0.07"/></g><g transform="translate(32 252)"><circle cx="16" cy="16" r="16" fill="#0D7377" opacity="0.1"/><text x="16" y="21" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="#0D7377">2</text><rect x="44" y="6" width="180" height="10" rx="5" fill="#1A1A1A" opacity="0.12"/><rect x="44" y="22" width="300" height="7" rx="3.5" fill="#1A1A1A" opacity="0.07"/></g><g transform="translate(32 304)"><circle cx="16" cy="16" r="16" fill="#0D7377" opacity="0.1"/><text x="16" y="21" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="#0D7377">3</text><rect x="44" y="6" width="220" height="10" rx="5" fill="#1A1A1A" opacity="0.12"/><rect x="44" y="22" width="280" height="7" rx="3.5" fill="#1A1A1A" opacity="0.07"/></g><rect x="32" y="356" width="160" height="44" rx="22" fill="#0D7377"/><text x="112" y="384" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="#FFFFFF">Read more</text></g><g transform="translate(780 80)"><rect width="320" height="160" rx="20" fill="#0D7377" filter="drop-shadow(0 8px 24px rgba(13,115,119,0.15))"/><text x="32" y="50" font-family="Inter, sans-serif" font-size="48" font-weight="800" fill="#FFFFFF">87%</text><text x="32" y="78" font-family="Inter, sans-serif" font-size="13" fill="#FFFFFF" opacity="0.8">of people in your situation</text><text x="32" y="98" font-family="Inter, sans-serif" font-size="13" fill="#FFFFFF" opacity="0.8">see results in 30 days</text><rect x="32" y="120" width="256" height="8" rx="4" fill="#FFFFFF" opacity="0.2"/><rect x="32" y="120" width="224" height="8" rx="4" fill="#FFFFFF" opacity="0.5"/></g><g transform="translate(780 280)"><rect width="320" height="160" rx="20" fill="#FFFFFF" filter="drop-shadow(0 4px 16px rgba(0,0,0,0.06))"/><rect x="24" y="24" width="40" height="40" rx="20" fill="#0D7377" opacity="0.1"/><path d="M36 36 L44 36 L44 52 M52 44 L44 52 L36 44" stroke="#0D7377" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="80" y="30" width="140" height="10" rx="5" fill="#1A1A1A" opacity="0.12"/><rect x="80" y="50" width="200" height="7" rx="3.5" fill="#1A1A1A" opacity="0.07"/><rect x="24" y="88" width="272" height="44" rx="10" fill="#F0FDFA" stroke="#0D7377" stroke-width="1.5"/><text x="160" y="116" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="#0D7377">Download the playbook</text></g></svg>`;

const HERO_ABANDONER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="ab1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF7ED"/><stop offset="1" stop-color="#FEF3C7"/></linearGradient></defs><rect width="1200" height="500" fill="url(#ab1)"/><circle cx="900" cy="100" r="300" fill="#0D7377" opacity="0.03"/><g transform="translate(140 60)"><rect width="500" height="380" rx="24" fill="#FFFFFF" filter="drop-shadow(0 8px 32px rgba(0,0,0,0.08))"/><g transform="translate(40 40)"><rect width="420" height="60" rx="30" fill="#FEF3C7"/><rect width="320" height="60" rx="30" fill="#0D7377" opacity="0.15"/><rect width="280" height="60" rx="30" fill="#0D7377"/><text x="140" y="38" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="#FFFFFF">80% complete</text><circle cx="400" cy="30" r="20" fill="#FFFFFF" stroke="#F59E0B" stroke-width="3"/><text x="400" y="35" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#F59E0B">!</text></g><text x="40" y="148" font-family="Inter, sans-serif" font-size="26" font-weight="800" fill="#1A1A1A">One question left</text><text x="40" y="178" font-family="Inter, sans-serif" font-size="14" fill="#6B7280">We saved your progress - pick up</text><text x="40" y="198" font-family="Inter, sans-serif" font-size="14" fill="#6B7280">right where you left off</text><rect x="40" y="230" width="420" height="80" rx="12" fill="#F0FDFA" stroke="#0D7377" stroke-width="1.5"/><circle cx="80" cy="270" r="20" fill="#0D7377" opacity="0.12"/><text x="80" y="276" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" font-weight="700" fill="#0D7377">?</text><rect x="116" y="252" width="200" height="10" rx="5" fill="#1A1A1A" opacity="0.1"/><rect x="116" y="274" width="300" height="8" rx="4" fill="#1A1A1A" opacity="0.06"/><rect x="40" y="340" width="180" height="48" rx="24" fill="#0D7377"/><text x="130" y="370" text-anchor="middle" font-family="Inter, sans-serif" font-size="15" font-weight="700" fill="#FFFFFF">Finish the quiz</text><rect x="240" y="340" width="120" height="48" rx="24" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"/><text x="300" y="370" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="600" fill="#6B7280">60 sec</text></g><g transform="translate(740 100)"><rect width="340" height="300" rx="20" fill="#0D7377" filter="drop-shadow(0 8px 24px rgba(13,115,119,0.2))"/><circle cx="170" cy="100" r="60" fill="#FFFFFF" opacity="0.1"/><circle cx="170" cy="100" r="44" fill="#FFFFFF" opacity="0.1"/><path d="M158 82 L158 100 L174 108" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round"/><text x="170" y="190" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" font-weight="700" fill="#FFFFFF">Your result is waiting</text><text x="170" y="216" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" fill="#FFFFFF" opacity="0.7">Just one more answer</text><rect x="60" y="244" width="220" height="6" rx="3" fill="#FFFFFF" opacity="0.15"/><rect x="60" y="244" width="176" height="6" rx="3" fill="#FFFFFF" opacity="0.4"/></g></svg>`;

const HERO_BOOKING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="bk1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0FDFA"/><stop offset="1" stop-color="#ECFDF5"/></linearGradient></defs><rect width="1200" height="500" fill="url(#bk1)"/><circle cx="1050" cy="400" r="200" fill="#0D7377" opacity="0.04"/><g transform="translate(100 50)"><rect width="560" height="400" rx="24" fill="#FFFFFF" filter="drop-shadow(0 8px 32px rgba(0,0,0,0.08))"/><rect x="0" y="0" width="560" height="80" rx="24" fill="#0D7377"/><rect x="0" y="50" width="560" height="30" fill="#0D7377"/><text x="40" y="50" font-family="Inter, sans-serif" font-size="20" font-weight="700" fill="#FFFFFF">Book a Call</text><text x="460" y="46" font-family="Inter, sans-serif" font-size="12" fill="#FFFFFF" opacity="0.7">15 min</text><g transform="translate(30 100)"><text x="0" y="20" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="#6B7280">APRIL 2026</text><g transform="translate(0 40)"><rect width="64" height="56" rx="10" fill="#F0FDFA"/><text x="32" y="24" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#6B7280">Mon</text><text x="32" y="44" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" font-weight="700" fill="#1A1A1A">21</text><rect x="76" width="64" height="56" rx="10" fill="#F0FDFA"/><text x="108" y="24" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#6B7280">Tue</text><text x="108" y="44" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" font-weight="700" fill="#1A1A1A">22</text><rect x="152" width="64" height="56" rx="10" fill="#0D7377"/><text x="184" y="24" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#FFFFFF" opacity="0.8">Wed</text><text x="184" y="44" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" font-weight="700" fill="#FFFFFF">23</text><rect x="228" width="64" height="56" rx="10" fill="#F0FDFA"/><text x="260" y="24" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#6B7280">Thu</text><text x="260" y="44" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" font-weight="700" fill="#1A1A1A">24</text><rect x="304" width="64" height="56" rx="10" fill="#F0FDFA"/><text x="336" y="24" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#6B7280">Fri</text><text x="336" y="44" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" font-weight="700" fill="#1A1A1A">25</text><rect x="380" width="64" height="56" rx="10" fill="#F7F7F5"/><text x="412" y="24" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#D1D5DB">Sat</text><text x="412" y="44" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" font-weight="400" fill="#D1D5DB">26</text></g><text x="0" y="128" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="#6B7280">AVAILABLE TIMES</text><g transform="translate(0 144)"><rect width="120" height="40" rx="10" fill="#F0FDFA" stroke="#0D7377" stroke-width="1.5"/><text x="60" y="26" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="#0D7377">9:00 AM</text><rect x="132" width="120" height="40" rx="10" fill="#0D7377"/><text x="192" y="26" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="#FFFFFF">10:30 AM</text><rect x="264" width="120" height="40" rx="10" fill="#F0FDFA" stroke="#0D7377" stroke-width="1.5"/><text x="324" y="26" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="#0D7377">2:00 PM</text></g></g></g><g transform="translate(740 80)"><rect width="360" height="340" rx="20" fill="#FFFFFF" filter="drop-shadow(0 4px 16px rgba(0,0,0,0.06))"/><circle cx="180" cy="80" r="44" fill="#0D7377" opacity="0.1"/><circle cx="180" cy="80" r="30" fill="#0D7377" opacity="0.15"/><path d="M168 72 L168 88 L180 96 L192 88 L192 72Z" fill="#0D7377" opacity="0.3"/><text x="180" y="152" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="#1A1A1A">Free consultation</text><text x="180" y="178" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" fill="#6B7280">15 min, no strings attached</text><rect x="40" y="206" width="280" height="1" fill="#E5E7EB"/><text x="60" y="240" font-family="Inter, sans-serif" font-size="13" fill="#6B7280">Your setup review</text><text x="60" y="264" font-family="Inter, sans-serif" font-size="13" fill="#6B7280">Biggest blocker</text><text x="60" y="288" font-family="Inter, sans-serif" font-size="13" fill="#6B7280">Next action step</text><circle cx="48" cy="236" r="4" fill="#0D7377"/><circle cx="48" cy="260" r="4" fill="#0D7377"/><circle cx="48" cy="284" r="4" fill="#0D7377"/></g></svg>`;

const HERO_DISCOUNT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="dc1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0D7377"/><stop offset="0.5" stop-color="#065F63"/><stop offset="1" stop-color="#064E52"/></linearGradient></defs><rect width="1200" height="500" fill="url(#dc1)"/><circle cx="200" cy="100" r="300" fill="#FFFFFF" opacity="0.03"/><circle cx="1000" cy="400" r="250" fill="#FFFFFF" opacity="0.03"/><circle cx="600" cy="250" r="400" fill="#FFFFFF" opacity="0.02"/><g transform="translate(100 80)"><rect width="480" height="340" rx="24" fill="#FFFFFF" opacity="0.1"/><text x="240" y="80" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="600" fill="#FFFFFF" opacity="0.7" letter-spacing="4">EXCLUSIVE OFFER</text><text x="240" y="180" text-anchor="middle" font-family="Inter, sans-serif" font-size="120" font-weight="900" fill="#FFFFFF">20%</text><text x="240" y="230" text-anchor="middle" font-family="Inter, sans-serif" font-size="28" font-weight="300" fill="#FFFFFF" opacity="0.8" letter-spacing="8">OFF</text><rect x="120" y="260" width="240" height="52" rx="26" fill="#FFFFFF"/><text x="240" y="292" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" font-weight="700" fill="#0D7377">Claim your discount</text></g><g transform="translate(680 100)"><rect width="400" height="120" rx="16" fill="#FFFFFF" opacity="0.1"/><text x="24" y="40" font-family="Inter, sans-serif" font-size="14" font-weight="600" fill="#FFFFFF" opacity="0.8">Matched to your result</text><text x="24" y="68" font-family="Inter, sans-serif" font-size="13" fill="#FFFFFF" opacity="0.6">This offer is based on your quiz outcome,</text><text x="24" y="88" font-family="Inter, sans-serif" font-size="13" fill="#FFFFFF" opacity="0.6">not a generic broadcast.</text></g><g transform="translate(680 260)"><rect width="190" height="160" rx="16" fill="#FFFFFF" opacity="0.1"/><text x="95" y="50" text-anchor="middle" font-family="Inter, sans-serif" font-size="36" font-weight="800" fill="#FFFFFF">48</text><text x="95" y="74" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF" opacity="0.7" letter-spacing="2">HOURS LEFT</text><rect x="30" y="100" width="130" height="6" rx="3" fill="#FFFFFF" opacity="0.15"/><rect x="30" y="100" width="90" height="6" rx="3" fill="#FCD34D" opacity="0.8"/><rect x="30" y="120" width="130" height="28" rx="14" fill="#FFFFFF" opacity="0.15"/><text x="95" y="140" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#FFFFFF">Auto-applied</text></g><g transform="translate(890 260)"><rect width="190" height="160" rx="16" fill="#FFFFFF" opacity="0.1"/><text x="95" y="50" text-anchor="middle" font-family="Inter, sans-serif" font-size="36" font-weight="800" fill="#FCD34D">1</text><text x="95" y="74" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF" opacity="0.7" letter-spacing="2">CLICK</text><text x="95" y="110" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" fill="#FFFFFF" opacity="0.5">No code needed</text><text x="95" y="130" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" fill="#FFFFFF" opacity="0.5">Applies at checkout</text></g></svg>`;

// --- Templates --------------------------------------------------------------

const postQuizWelcome: EmailTemplate = {
  id: 'post-quiz-welcome',
  category: 'post-quiz',
  title: 'Post-quiz welcome',
  oneLiner: 'Delivers the result the moment the quiz ends. The most-opened email a quiz sends.',
  whyQuizNative: 'Headline is the outcome name. Stat shows their score. Body references their top answer. Impossible to build with a generic email tool.',
  defaultSubject: '{{first_name}}, your result is ready: {{outcome_name}}',
  defaultPreheader: 'Based on your answers to {{quiz_name}}.',
  mergeTags: ['first_name', 'outcome_name', 'outcome_description', 'outcome_score', 'quiz_name', 'answer:biggest_goal', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_POST_QUIZ, eyebrow: 'YOUR RESULT', headline: '{{outcome_name}}', subheadline: 'Based on your answers to {{quiz_name}}.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'heading-1', type: 'heading', level: 2, text: 'Hi {{first_name}}, here is what we found.' },
    { id: 'text-1', type: 'text', content: '{{outcome_description}} You told us your biggest goal was <strong>{{answer:biggest_goal}}</strong>, so we picked this result with that in mind.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'stat-1', type: 'stat', columns: 3, items: [
      { value: '{{outcome_score}}', label: 'Your match score' },
      { value: '4.9', label: 'Average rating' },
      { value: '5 min', label: 'To get started' },
    ]},
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'See the full plan', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'divider-1', type: 'divider', style: 'solid' },
    { id: 'sig-1', type: 'signature', name: 'The {{brand_name}} team', title: 'Here if you need us', message: 'Reply to this email with any question, we read every one.' },
    { id: 'ps-1', type: 'postscript', content: 'P.S. Save this email. Your result link stays live for 30 days.' },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const outcomeRecommendation: EmailTemplate = {
  id: 'outcome-recommendation',
  category: 'outcome',
  title: 'Outcome recommendation',
  oneLiner: 'Three recommendations tailored to the quiz outcome, shown in a card grid.',
  whyQuizNative: 'The three cards are chosen by outcome, not by broadcast. Each card CTA is outcome-specific and deep-linked.',
  defaultSubject: 'Three things we picked for your {{outcome_name}} result',
  defaultPreheader: 'Hand-picked for your answers, not a generic list.',
  mergeTags: ['first_name', 'outcome_name', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_OUTCOME, eyebrow: 'PICKED FOR YOU', headline: 'Three things that fit {{outcome_name}}', subheadline: 'Hand-selected based on your quiz answers.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'text-1', type: 'text', content: 'Hi {{first_name}}, instead of dropping you into a catalog, we narrowed it down to three things that match your result. Start with whichever feels most useful.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'cards-1', type: 'cardGrid', columns: 3, cards: [
      { id: 'c1', title: 'Start here', body: 'The single best first step for your result.', ctaLabel: 'Open', ctaUrl: '{{cta_url}}' },
      { id: 'c2', title: 'The template', body: 'A ready-made version you can duplicate in one click.', ctaLabel: 'Get it', ctaUrl: '{{cta_url}}' },
      { id: 'c3', title: 'Book a call', body: 'Talk to a human if you want a second opinion.', ctaLabel: 'Pick a time', ctaUrl: '{{cta_url}}' },
    ]},
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'test-1', type: 'testimonial', quote: 'The quiz put me on the exact template I needed. Saved me a week of research.', authorName: 'Priya S.', authorTitle: 'Independent designer', rating: 5 },
    { id: 'spacer-4', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'See all three', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'ps-1', type: 'postscript', content: 'P.S. These recommendations change as we learn more. Retake the quiz in a few months and the list will look different.' },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const nurtureByAnswer: EmailTemplate = {
  id: 'nurture-by-answer',
  category: 'nurture',
  title: 'Nurture by answer',
  oneLiner: 'Day-3 follow-up that references the exact answer the recipient gave to a key question.',
  whyQuizNative: 'The subject line and body both quote back a specific quiz answer. A generic newsletter tool cannot do this.',
  defaultSubject: 'About {{answer:biggest_goal}} - here is what usually works',
  defaultPreheader: 'Following up on your quiz result.',
  mergeTags: ['first_name', 'answer:biggest_goal', 'outcome_name', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_NURTURE, eyebrow: 'FOLLOWING UP', headline: 'About {{answer:biggest_goal}}', subheadline: 'A short read on what has worked for people in your situation.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'text-1', type: 'text', content: 'Hi {{first_name}}, when you took our quiz you told us your biggest goal was <strong>{{answer:biggest_goal}}</strong>. That is the most common answer we see for people who land on {{outcome_name}}, and there is a short playbook that usually works.' },
    { id: 'heading-1', type: 'heading', level: 3, text: 'The three things to do first' },
    { id: 'text-2', type: 'text', content: '<strong>1.</strong> Pick one channel and stop trying to be everywhere.<br/><strong>2.</strong> Write one clear offer before you design anything.<br/><strong>3.</strong> Ship a v1 in a week, not a quarter.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'button-1', type: 'button', label: 'Read the full playbook', url: '{{cta_url}}', variant: 'secondary', align: 'left' },
    { id: 'divider-1', type: 'divider', style: 'solid' },
    { id: 'sig-1', type: 'signature', name: 'Hit reply any time', message: 'If any of this does not fit your situation, tell me what is different. I read every reply.' },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const abandonerReengage: EmailTemplate = {
  id: 'abandoner-reengage',
  category: 'abandoner',
  title: 'Abandoner re-engage',
  oneLiner: 'Fires when someone gave an email mid-quiz but never finished. Offers to finish for them.',
  whyQuizNative: 'Only triggers because the quiz captured email before the last question. No other email tool knows a quiz was abandoned.',
  defaultSubject: '{{first_name}}, your result is one question away',
  defaultPreheader: 'You got most of the way - we saved your progress.',
  mergeTags: ['first_name', 'quiz_name', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_ABANDONER, eyebrow: 'ALMOST THERE', headline: 'One question left', subheadline: 'You got most of the way through {{quiz_name}} and we saved your place.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'text-1', type: 'text', content: 'Hi {{first_name}}, you stepped away before we showed your result. Your answers are saved. One more question and we can send you the match.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'stat-1', type: 'stat', columns: 2, items: [
      { value: '60 sec', label: 'To finish' },
      { value: 'Saved', label: 'Your progress' },
    ]},
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'Pick up where I left off', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'ps-1', type: 'postscript', content: 'P.S. If you already got an answer elsewhere, no hard feelings. Reply STOP and we will not send another reminder.' },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const consultationBooking: EmailTemplate = {
  id: 'consultation-booking',
  category: 'booking',
  title: 'Consultation booking',
  oneLiner: 'Invites the recipient to book a call, tuned to outcomes that signal high intent.',
  whyQuizNative: 'Only sent to outcomes flagged as consultation-ready. The generic email world blasts booking links to everyone.',
  defaultSubject: '{{first_name}}, want a 15-minute look at this?',
  defaultPreheader: 'Based on your {{outcome_name}} result.',
  mergeTags: ['first_name', 'outcome_name', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_BOOKING, eyebrow: 'OFFER', headline: '15 minutes, on us', subheadline: 'Your {{outcome_name}} result is the kind we love to talk through live.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'text-1', type: 'text', content: 'Hi {{first_name}}, I looked at your quiz answers and I think a short call would save you a month of second-guessing. No slides, no pitch, just a working session on your specific situation.' },
    { id: 'heading-1', type: 'heading', level: 3, text: 'What we will cover' },
    { id: 'text-2', type: 'text', content: 'Your current setup in your own words. The single biggest blocker. A concrete next step you can ship this week. That is it.' },
    { id: 'spacer-2', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'Pick a time', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'divider-1', type: 'divider', style: 'solid' },
    { id: 'test-1', type: 'testimonial', quote: 'I thought it was a sales call. It was not. I walked away with three things I shipped the same week.', authorName: 'Marcus T.', authorTitle: 'Founder, early-stage SaaS', rating: 5 },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const discountByOutcome: EmailTemplate = {
  id: 'discount-by-outcome',
  category: 'discount',
  title: 'Discount by outcome',
  oneLiner: '48-hour discount matched to the recipient\u2019s quiz outcome. Only sent to segments that need a nudge.',
  whyQuizNative: 'The discount amount and product are chosen per outcome. Not a broadcast blast.',
  defaultSubject: '{{first_name}}, 20% off the thing that fits your result',
  defaultPreheader: '48 hours, matched to {{outcome_name}}.',
  mergeTags: ['first_name', 'outcome_name', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_DISCOUNT, eyebrow: '48 HOURS ONLY', headline: '20% off, matched to {{outcome_name}}', subheadline: 'We picked the product that fits your quiz result and took 20% off for two days.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'text-1', type: 'text', content: 'Hi {{first_name}}, most offer emails are generic. This one is not. We looked at your {{outcome_name}} result and the 20% is tied to the one product that actually matches it.' },
    { id: 'spacer-2', type: 'spacer', height: 16 },
    { id: 'stat-1', type: 'stat', columns: 3, items: [
      { value: '20%', label: 'Off your match' },
      { value: '48 hrs', label: 'Until it expires' },
      { value: '1-click', label: 'Code applies itself' },
    ]},
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'Claim my 20%', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'ps-1', type: 'postscript', content: 'P.S. No code to remember. The link applies the discount automatically.' },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true, legalNote: 'Offer expires 48 hours from send. One use per account.' },
  ],
};

// --- Site-type hero illustrations --------------------------------------------

const HERO_PORTFOLIO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="pf1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F8FAFC"/><stop offset="1" stop-color="#F1F5F9"/></linearGradient></defs><rect width="1200" height="500" fill="url(#pf1)"/><g transform="translate(60 40)"><rect width="340" height="240" rx="16" fill="#FFFFFF" filter="drop-shadow(0 4px 16px rgba(0,0,0,0.06))"/><rect x="12" y="12" width="316" height="170" rx="10" fill="#0D7377" opacity="0.08"/><rect x="12" y="12" width="316" height="170" rx="10" fill="none" stroke="#0D7377" stroke-width="1" opacity="0.15"/><rect x="40" y="50" width="120" height="100" rx="8" fill="#0D7377" opacity="0.12"/><rect x="180" y="30" width="120" height="70" rx="8" fill="#0D7377" opacity="0.18"/><rect x="180" y="112" width="120" height="58" rx="8" fill="#0D7377" opacity="0.1"/><rect x="20" y="196" width="120" height="8" rx="4" fill="#0D7377"/><rect x="20" y="214" width="80" height="6" rx="3" fill="#6B7280" opacity="0.3"/></g><g transform="translate(430 40)"><rect width="340" height="240" rx="16" fill="#FFFFFF" filter="drop-shadow(0 4px 16px rgba(0,0,0,0.06))"/><rect x="12" y="12" width="316" height="170" rx="10" fill="#0D7377" opacity="0.06"/><rect x="24" y="36" width="280" height="120" rx="8" fill="#0D7377" opacity="0.12"/><circle cx="164" cy="96" r="30" fill="#0D7377" opacity="0.15"/><path d="M152 88 L152 104 L172 96Z" fill="#0D7377" opacity="0.3"/><rect x="20" y="196" width="140" height="8" rx="4" fill="#0D7377"/><rect x="20" y="214" width="100" height="6" rx="3" fill="#6B7280" opacity="0.3"/></g><g transform="translate(800 40)"><rect width="340" height="240" rx="16" fill="#0D7377" filter="drop-shadow(0 8px 24px rgba(13,115,119,0.15))"/><rect x="12" y="12" width="316" height="170" rx="10" fill="#FFFFFF" opacity="0.1"/><rect x="40" y="40" width="100" height="110" rx="8" fill="#FFFFFF" opacity="0.15"/><rect x="160" y="40" width="140" height="50" rx="8" fill="#FFFFFF" opacity="0.12"/><rect x="160" y="100" width="140" height="50" rx="8" fill="#FFFFFF" opacity="0.08"/><rect x="20" y="196" width="140" height="8" rx="4" fill="#FFFFFF" opacity="0.7"/><rect x="20" y="214" width="100" height="6" rx="3" fill="#FFFFFF" opacity="0.4"/></g><g transform="translate(60 310)"><rect width="1080" height="140" rx="16" fill="#FFFFFF" filter="drop-shadow(0 4px 16px rgba(0,0,0,0.04))"/><circle cx="80" cy="70" r="36" fill="#0D7377" opacity="0.1"/><circle cx="80" cy="70" r="24" fill="#0D7377" opacity="0.15"/><rect x="140" y="36" width="200" height="10" rx="5" fill="#0D7377"/><rect x="140" y="58" width="400" height="8" rx="4" fill="#1A1A1A" opacity="0.08"/><rect x="140" y="78" width="340" height="8" rx="4" fill="#1A1A1A" opacity="0.06"/><rect x="840" y="46" width="160" height="44" rx="22" fill="#0D7377"/><text x="920" y="74" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="700" fill="#FFFFFF">View portfolio</text></g></svg>`;

const HERO_RESTAURANT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="rs1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FEF7EC"/><stop offset="1" stop-color="#FFF7ED"/></linearGradient></defs><rect width="1200" height="500" fill="url(#rs1)"/><circle cx="600" cy="250" r="300" fill="#0D7377" opacity="0.03"/><g transform="translate(80 60)"><rect width="520" height="380" rx="24" fill="#FFFFFF" filter="drop-shadow(0 8px 32px rgba(0,0,0,0.08))"/><rect x="24" y="24" width="472" height="200" rx="16" fill="#0D7377" opacity="0.06"/><circle cx="160" cy="100" r="60" fill="#0D7377" opacity="0.1"/><circle cx="160" cy="100" r="40" fill="#0D7377" opacity="0.12"/><circle cx="360" cy="80" r="50" fill="#0D7377" opacity="0.08"/><circle cx="320" cy="150" r="30" fill="#0D7377" opacity="0.06"/><text x="40" y="260" font-family="Inter, sans-serif" font-size="20" font-weight="800" fill="#1A1A1A">Your menu, perfected</text><text x="40" y="286" font-family="Inter, sans-serif" font-size="13" fill="#6B7280">Layout matched to your cuisine style</text><g transform="translate(40 310)"><rect width="100" height="36" rx="18" fill="#0D7377"/><text x="50" y="24" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#FFFFFF">Preview</text><rect x="116" width="60" height="36" rx="18" fill="#F0FDFA" stroke="#0D7377" stroke-width="1.5"/><text x="146" y="24" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="#0D7377">QR</text><rect x="192" width="80" height="36" rx="18" fill="#F0FDFA" stroke="#0D7377" stroke-width="1.5"/><text x="232" y="24" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="#0D7377">Orders</text></g></g><g transform="translate(660 60)"><rect width="460" height="180" rx="20" fill="#FFFFFF" filter="drop-shadow(0 4px 16px rgba(0,0,0,0.06))"/><rect x="20" y="20" width="140" height="140" rx="12" fill="#0D7377" opacity="0.08"/><circle cx="90" cy="70" r="30" fill="#0D7377" opacity="0.1"/><rect x="180" y="32" width="160" height="10" rx="5" fill="#0D7377"/><rect x="180" y="54" width="240" height="8" rx="4" fill="#1A1A1A" opacity="0.1"/><rect x="180" y="74" width="200" height="8" rx="4" fill="#1A1A1A" opacity="0.07"/><rect x="180" y="108" width="80" height="28" rx="14" fill="#0D7377"/><text x="220" y="128" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#FFFFFF">Order</text><text x="370" y="128" font-family="Inter, sans-serif" font-size="16" font-weight="700" fill="#0D7377">$18</text></g><g transform="translate(660 270)"><rect width="460" height="170" rx="20" fill="#0D7377" filter="drop-shadow(0 8px 24px rgba(13,115,119,0.15))"/><text x="32" y="50" font-family="Inter, sans-serif" font-size="36" font-weight="800" fill="#FFFFFF">+40%</text><text x="32" y="78" font-family="Inter, sans-serif" font-size="14" fill="#FFFFFF" opacity="0.8">online order increase</text><rect x="32" y="100" width="200" height="40" rx="20" fill="#FFFFFF" opacity="0.15"/><text x="132" y="126" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF">See the menu layout</text></g></svg>`;

const HERO_SHOP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sh1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F5F3FF"/><stop offset="1" stop-color="#F0FDFA"/></linearGradient></defs><rect width="1200" height="500" fill="url(#sh1)"/><g transform="translate(80 40)"><rect width="260" height="340" rx="20" fill="#FFFFFF" filter="drop-shadow(0 8px 24px rgba(0,0,0,0.06))"/><rect x="16" y="16" width="228" height="200" rx="12" fill="#0D7377" opacity="0.06"/><circle cx="114" cy="100" r="50" fill="#0D7377" opacity="0.1"/><rect x="80" y="70" width="68" height="68" rx="8" fill="#0D7377" opacity="0.12" transform="rotate(15 114 100)"/><rect x="16" y="232" width="140" height="10" rx="5" fill="#1A1A1A" opacity="0.12"/><rect x="16" y="254" width="80" height="8" rx="4" fill="#0D7377"/><rect x="16" y="284" width="100" height="36" rx="18" fill="#0D7377"/><text x="66" y="308" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#FFFFFF">Add to cart</text></g><g transform="translate(370 40)"><rect width="260" height="340" rx="20" fill="#FFFFFF" filter="drop-shadow(0 8px 24px rgba(0,0,0,0.06))"/><rect x="16" y="16" width="228" height="200" rx="12" fill="#065F63" opacity="0.08"/><circle cx="114" cy="90" r="44" fill="#0D7377" opacity="0.1"/><rect x="16" y="232" width="160" height="10" rx="5" fill="#1A1A1A" opacity="0.12"/><rect x="16" y="254" width="100" height="8" rx="4" fill="#0D7377"/><rect x="16" y="284" width="100" height="36" rx="18" fill="#0D7377"/><text x="66" y="308" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#FFFFFF">Add to cart</text></g><g transform="translate(660 40)"><rect width="260" height="340" rx="20" fill="#FFFFFF" filter="drop-shadow(0 8px 24px rgba(0,0,0,0.06))"/><rect x="16" y="16" width="228" height="200" rx="12" fill="#0D7377" opacity="0.05"/><circle cx="114" cy="96" r="48" fill="#0D7377" opacity="0.08"/><rect x="60" y="60" width="108" height="80" rx="10" fill="#0D7377" opacity="0.1"/><rect x="16" y="232" width="120" height="10" rx="5" fill="#1A1A1A" opacity="0.12"/><rect x="16" y="254" width="70" height="8" rx="4" fill="#0D7377"/><rect x="16" y="284" width="100" height="36" rx="18" fill="#0D7377"/><text x="66" y="308" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#FFFFFF">Add to cart</text></g><g transform="translate(950 40)"><rect width="200" height="340" rx="20" fill="#0D7377" filter="drop-shadow(0 8px 24px rgba(13,115,119,0.15))"/><text x="100" y="80" text-anchor="middle" font-family="Inter, sans-serif" font-size="48" font-weight="800" fill="#FFFFFF">3</text><text x="100" y="110" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="#FFFFFF" opacity="0.7" letter-spacing="2">PRODUCTS</text><rect x="30" y="140" width="140" height="1" fill="#FFFFFF" opacity="0.15"/><text x="100" y="180" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" fill="#FFFFFF" opacity="0.6">Matched to your</text><text x="100" y="200" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" fill="#FFFFFF" opacity="0.6">catalog size</text><rect x="30" y="240" width="140" height="44" rx="22" fill="#FFFFFF"/><text x="100" y="268" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="700" fill="#0D7377">Set up store</text></g><g transform="translate(80 410)"><rect width="1070" height="60" rx="12" fill="#FFFFFF" filter="drop-shadow(0 2px 8px rgba(0,0,0,0.04))"/><text x="20" y="38" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="#6B7280">Grid layout matched to your catalog</text><rect x="860" y="14" width="180" height="32" rx="16" fill="#F0FDFA"/><text x="950" y="36" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#0D7377">1-click checkout ready</text></g></svg>`;

const HERO_BLOG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="bl1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F8FAFC"/><stop offset="1" stop-color="#EFF6FF"/></linearGradient></defs><rect width="1200" height="500" fill="url(#bl1)"/><circle cx="1100" cy="100" r="200" fill="#0D7377" opacity="0.03"/><g transform="translate(80 50)"><rect width="640" height="400" rx="24" fill="#FFFFFF" filter="drop-shadow(0 8px 32px rgba(0,0,0,0.06))"/><rect x="32" y="32" width="200" height="24" rx="12" fill="#0D7377" opacity="0.1"/><text x="132" y="50" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#0D7377">YOUR CONTENT PLAN</text><text x="32" y="100" font-family="Inter, sans-serif" font-size="28" font-weight="800" fill="#1A1A1A">4 posts to start</text><text x="32" y="128" font-family="Inter, sans-serif" font-size="14" fill="#6B7280">A calendar built around your niche and cadence</text><g transform="translate(32 156)"><rect width="576" height="48" rx="10" fill="#F0FDFA" stroke="#0D7377" stroke-width="1"/><circle cx="24" cy="24" r="12" fill="#0D7377" opacity="0.15"/><text x="24" y="29" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#0D7377">1</text><text x="48" y="20" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="#1A1A1A">The origin story</text><text x="48" y="38" font-family="Inter, sans-serif" font-size="11" fill="#6B7280">Why you started writing about your niche</text></g><g transform="translate(32 214)"><rect width="576" height="48" rx="10" fill="#F8FAFC"/><circle cx="24" cy="24" r="12" fill="#0D7377" opacity="0.1"/><text x="24" y="29" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#0D7377">2</text><text x="48" y="20" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="#1A1A1A">The how-to</text><text x="48" y="38" font-family="Inter, sans-serif" font-size="11" fill="#6B7280">One practical thing your reader can do today</text></g><g transform="translate(32 272)"><rect width="576" height="48" rx="10" fill="#F8FAFC"/><circle cx="24" cy="24" r="12" fill="#0D7377" opacity="0.1"/><text x="24" y="29" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#0D7377">3</text><text x="48" y="20" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="#1A1A1A">The opinion</text><text x="48" y="38" font-family="Inter, sans-serif" font-size="11" fill="#6B7280">A stance that separates you from everyone else</text></g><g transform="translate(32 330)"><rect width="576" height="48" rx="10" fill="#F8FAFC"/><circle cx="24" cy="24" r="12" fill="#0D7377" opacity="0.1"/><text x="24" y="29" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#0D7377">4</text><text x="48" y="20" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="#1A1A1A">The roundup</text><text x="48" y="38" font-family="Inter, sans-serif" font-size="11" fill="#6B7280">Tools and resources you actually use</text></g></g><g transform="translate(780 50)"><rect width="340" height="190" rx="20" fill="#0D7377" filter="drop-shadow(0 8px 24px rgba(13,115,119,0.15))"/><text x="32" y="50" font-family="Inter, sans-serif" font-size="14" font-weight="600" fill="#FFFFFF" opacity="0.7" letter-spacing="2">YOUR BLOG</text><text x="32" y="90" font-family="Inter, sans-serif" font-size="32" font-weight="800" fill="#FFFFFF">Ready</text><text x="32" y="120" font-family="Inter, sans-serif" font-size="14" fill="#FFFFFF" opacity="0.7">Layout and schedule matched</text><rect x="32" y="144" width="160" height="28" rx="14" fill="#FFFFFF" opacity="0.2"/><text x="112" y="164" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF">See your layout</text></g><g transform="translate(780 270)"><rect width="340" height="180" rx="20" fill="#FFFFFF" filter="drop-shadow(0 4px 16px rgba(0,0,0,0.06))"/><rect x="24" y="24" width="292" height="80" rx="12" fill="#0D7377" opacity="0.04"/><rect x="40" y="40" width="200" height="10" rx="5" fill="#0D7377" opacity="0.15"/><rect x="40" y="60" width="260" height="8" rx="4" fill="#1A1A1A" opacity="0.06"/><rect x="40" y="76" width="220" height="8" rx="4" fill="#1A1A1A" opacity="0.04"/><rect x="24" y="124" width="100" height="32" rx="16" fill="#0D7377"/><text x="74" y="146" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#FFFFFF">Read more</text></g></svg>`;

const HERO_WEDDING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="wd1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1F2"/><stop offset="0.5" stop-color="#FFF7ED"/><stop offset="1" stop-color="#FFFBEB"/></linearGradient></defs><rect width="1200" height="500" fill="url(#wd1)"/><circle cx="600" cy="250" r="300" fill="#0D7377" opacity="0.02"/><circle cx="600" cy="250" r="200" fill="#0D7377" opacity="0.02"/><g transform="translate(300 40)"><rect width="600" height="420" rx="24" fill="#FFFFFF" filter="drop-shadow(0 12px 40px rgba(0,0,0,0.08))"/><rect x="40" y="40" width="520" height="200" rx="16" fill="#0D7377" opacity="0.04"/><g transform="translate(300 100)"><path d="M0 -40 C20 -60, 40 -40, 40 -20 C40 10, 0 40, 0 40 C0 40, -40 10, -40 -20 C-40 -40, -20 -60, 0 -40Z" fill="#0D7377" opacity="0.15"/></g><g transform="translate(220 70)"><circle r="30" fill="#0D7377" opacity="0.05"/></g><g transform="translate(400 140)"><circle r="20" fill="#0D7377" opacity="0.04"/></g><text x="300" y="284" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="600" fill="#0D7377" opacity="0.6" letter-spacing="6">SAVE THE DATE</text><text x="300" y="330" text-anchor="middle" font-family="Inter, sans-serif" font-size="32" font-weight="300" fill="#1A1A1A" letter-spacing="2">Your theme is ready</text><text x="300" y="360" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" fill="#6B7280">Matched to your venue and season</text><rect x="200" y="386" width="200" height="44" rx="22" fill="#0D7377"/><text x="300" y="414" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="#FFFFFF">Preview theme</text></g><g transform="translate(60 80)"><rect width="200" height="80" rx="14" fill="#FFFFFF" filter="drop-shadow(0 4px 12px rgba(0,0,0,0.05))"/><text x="100" y="36" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#6B7280" letter-spacing="2">RSVP</text><text x="100" y="58" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="#0D7377">Built-in form</text></g><g transform="translate(60 190)"><rect width="200" height="80" rx="14" fill="#FFFFFF" filter="drop-shadow(0 4px 12px rgba(0,0,0,0.05))"/><text x="100" y="36" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#6B7280" letter-spacing="2">REGISTRY</text><text x="100" y="58" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="#0D7377">Link included</text></g><g transform="translate(60 300)"><rect width="200" height="80" rx="14" fill="#FFFFFF" filter="drop-shadow(0 4px 12px rgba(0,0,0,0.05))"/><text x="100" y="36" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#6B7280" letter-spacing="2">GALLERY</text><text x="100" y="58" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="#0D7377">Photo page</text></g><g transform="translate(940 80)"><rect width="200" height="340" rx="16" fill="#0D7377" filter="drop-shadow(0 8px 24px rgba(13,115,119,0.15))"/><g transform="translate(100 60)"><path d="M0 -30 C14 -44, 30 -30, 30 -14 C30 8, 0 30, 0 30 C0 30, -30 8, -30 -14 C-30 -30, -14 -44, 0 -30Z" fill="#FFFFFF" opacity="0.2"/></g><text x="100" y="130" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" font-weight="700" fill="#FFFFFF">Your palette</text><rect x="30" y="156" width="40" height="40" rx="20" fill="#FFFFFF" opacity="0.3"/><rect x="80" y="156" width="40" height="40" rx="20" fill="#FFFFFF" opacity="0.2"/><rect x="130" y="156" width="40" height="40" rx="20" fill="#FFFFFF" opacity="0.15"/><text x="100" y="240" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" fill="#FFFFFF" opacity="0.6">Custom colors</text><text x="100" y="260" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" fill="#FFFFFF" opacity="0.6">and typography</text><rect x="30" y="290" width="140" height="28" rx="14" fill="#FFFFFF" opacity="0.15"/><text x="100" y="310" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#FFFFFF">Customize</text></g></svg>`;

const HERO_FITNESS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="ft1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0FDFA"/><stop offset="1" stop-color="#ECFDF5"/></linearGradient><linearGradient id="ft2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0D7377"/><stop offset="1" stop-color="#065F63"/></linearGradient></defs><rect width="1200" height="500" fill="url(#ft1)"/><g transform="translate(80 50)"><rect width="540" height="400" rx="24" fill="#FFFFFF" filter="drop-shadow(0 8px 32px rgba(0,0,0,0.08))"/><rect x="32" y="32" width="80" height="28" rx="14" fill="#0D7377"/><text x="72" y="52" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#FFFFFF">FIT</text><text x="128" y="52" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="#6B7280">Program matched</text><text x="32" y="104" font-family="Inter, sans-serif" font-size="28" font-weight="800" fill="#1A1A1A">Your training plan</text><text x="32" y="132" font-family="Inter, sans-serif" font-size="14" fill="#6B7280">Scaled to your level and goals</text><g transform="translate(32 160)"><rect width="150" height="90" rx="14" fill="url(#ft2)" filter="drop-shadow(0 4px 12px rgba(13,115,119,0.15))"/><text x="75" y="38" text-anchor="middle" font-family="Inter, sans-serif" font-size="28" font-weight="800" fill="#FFFFFF">4x</text><text x="75" y="60" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#FFFFFF" opacity="0.7">per week</text></g><g transform="translate(196 160)"><rect width="150" height="90" rx="14" fill="#F0FDFA" stroke="#0D7377" stroke-width="1.5"/><text x="75" y="38" text-anchor="middle" font-family="Inter, sans-serif" font-size="28" font-weight="800" fill="#0D7377">45</text><text x="75" y="60" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#6B7280">minutes</text></g><g transform="translate(360 160)"><rect width="150" height="90" rx="14" fill="#F0FDFA" stroke="#0D7377" stroke-width="1.5"/><text x="75" y="38" text-anchor="middle" font-family="Inter, sans-serif" font-size="28" font-weight="800" fill="#0D7377">8</text><text x="75" y="60" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#6B7280">weeks</text></g><rect x="32" y="276" width="476" height="1" fill="#E5E7EB"/><g transform="translate(32 296)"><rect width="476" height="56" rx="10" fill="#F0FDFA"/><circle cx="28" cy="28" r="14" fill="#0D7377" opacity="0.15"/><path d="M22 28 L26 32 L34 24" stroke="#0D7377" stroke-width="2" fill="none" stroke-linecap="round"/><text x="56" y="24" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="#1A1A1A">Week 1: Foundation</text><text x="56" y="42" font-family="Inter, sans-serif" font-size="11" fill="#6B7280">Movement patterns, form, mobility</text></g><rect x="32" y="372" width="200" height="48" rx="24" fill="#0D7377"/><text x="132" y="402" text-anchor="middle" font-family="Inter, sans-serif" font-size="15" font-weight="700" fill="#FFFFFF">Start program</text></g><g transform="translate(700 50)"><rect width="420" height="400" rx="20" fill="#FFFFFF" filter="drop-shadow(0 4px 16px rgba(0,0,0,0.06))"/><rect x="24" y="24" width="372" height="180" rx="14" fill="url(#ft2)"/><g transform="translate(210 80)"><rect x="-100" y="-6" width="200" height="12" rx="6" fill="#FFFFFF" opacity="0.2"/><rect x="-80" y="-20" width="20" height="40" rx="4" fill="#FFFFFF" opacity="0.3"/><rect x="60" y="-20" width="20" height="40" rx="4" fill="#FFFFFF" opacity="0.3"/><rect x="-110" y="-16" width="16" height="32" rx="4" fill="#FFFFFF" opacity="0.2"/><rect x="94" y="-16" width="16" height="32" rx="4" fill="#FFFFFF" opacity="0.2"/><circle cx="-136" cy="0" r="12" fill="#FFFFFF" opacity="0.15"/><circle cx="136" cy="0" r="12" fill="#FFFFFF" opacity="0.15"/></g><text x="210" y="160" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" font-weight="700" fill="#FFFFFF">Personalized for you</text><rect x="24" y="224" width="372" height="60" rx="10" fill="#F0FDFA"/><text x="44" y="252" font-family="Inter, sans-serif" font-size="12" fill="#6B7280">Previous members with your profile saw</text><text x="44" y="270" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="#0D7377">82% improvement in 8 weeks</text><rect x="24" y="310" width="372" height="70" rx="10" fill="#F8FAFC"/><text x="48" y="340" font-family="Inter, sans-serif" font-size="13" fill="#1A1A1A" font-style="italic" opacity="0.6">"The quiz matched me perfectly."</text><text x="48" y="364" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#0D7377">Jake R., member since 2024</text></g></svg>`;

const HERO_SERVICES = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sv1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0FDFA"/><stop offset="1" stop-color="#F8FAFC"/></linearGradient></defs><rect width="1200" height="500" fill="url(#sv1)"/><circle cx="200" cy="400" r="200" fill="#0D7377" opacity="0.03"/><circle cx="1000" cy="100" r="200" fill="#0D7377" opacity="0.03"/><g transform="translate(80 50)"><rect width="480" height="400" rx="24" fill="#FFFFFF" filter="drop-shadow(0 8px 32px rgba(0,0,0,0.08))"/><rect x="32" y="32" width="416" height="120" rx="16" fill="#0D7377" filter="drop-shadow(0 4px 16px rgba(13,115,119,0.15))"/><text x="52" y="72" font-family="Inter, sans-serif" font-size="14" font-weight="600" fill="#FFFFFF" opacity="0.7" letter-spacing="2">YOUR PACKAGE</text><text x="52" y="110" font-family="Inter, sans-serif" font-size="28" font-weight="800" fill="#FFFFFF">Right-sized for you</text><g transform="translate(32 180)"><circle cx="14" cy="14" r="14" fill="#0D7377" opacity="0.12"/><path d="M8 14 L12 18 L20 10" stroke="#0D7377" stroke-width="2" fill="none" stroke-linecap="round"/><text x="40" y="12" font-family="Inter, sans-serif" font-size="14" font-weight="600" fill="#1A1A1A">Scoping call</text><text x="40" y="28" font-family="Inter, sans-serif" font-size="12" fill="#6B7280">Nail down deliverables</text></g><g transform="translate(32 228)"><circle cx="14" cy="14" r="14" fill="#0D7377" opacity="0.12"/><path d="M8 14 L12 18 L20 10" stroke="#0D7377" stroke-width="2" fill="none" stroke-linecap="round"/><text x="40" y="12" font-family="Inter, sans-serif" font-size="14" font-weight="600" fill="#1A1A1A">Weekly check-ins</text><text x="40" y="28" font-family="Inter, sans-serif" font-size="12" fill="#6B7280">Nothing drifts off track</text></g><g transform="translate(32 276)"><circle cx="14" cy="14" r="14" fill="#0D7377" opacity="0.12"/><path d="M8 14 L12 18 L20 10" stroke="#0D7377" stroke-width="2" fill="none" stroke-linecap="round"/><text x="40" y="12" font-family="Inter, sans-serif" font-size="14" font-weight="600" fill="#1A1A1A">Final review</text><text x="40" y="28" font-family="Inter, sans-serif" font-size="12" fill="#6B7280">Revisions built in</text></g><g transform="translate(32 324)"><circle cx="14" cy="14" r="14" fill="#0D7377" opacity="0.12"/><path d="M8 14 L12 18 L20 10" stroke="#0D7377" stroke-width="2" fill="none" stroke-linecap="round"/><text x="40" y="12" font-family="Inter, sans-serif" font-size="14" font-weight="600" fill="#1A1A1A">Full documentation</text><text x="40" y="28" font-family="Inter, sans-serif" font-size="12" fill="#6B7280">You own the output</text></g><rect x="32" y="376" width="180" height="48" rx="24" fill="#0D7377"/><text x="122" y="406" text-anchor="middle" font-family="Inter, sans-serif" font-size="15" font-weight="700" fill="#FFFFFF">Book scoping call</text></g><g transform="translate(640 50)"><rect width="480" height="190" rx="20" fill="#FFFFFF" filter="drop-shadow(0 4px 16px rgba(0,0,0,0.06))"/><text x="32" y="44" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="#6B7280" letter-spacing="2">MATCHED TO</text><text x="32" y="80" font-family="Inter, sans-serif" font-size="20" font-weight="700" fill="#1A1A1A">Your budget and timeline</text><rect x="32" y="108" width="200" height="8" rx="4" fill="#E5E7EB"/><rect x="32" y="108" width="140" height="8" rx="4" fill="#0D7377"/><text x="32" y="142" font-family="Inter, sans-serif" font-size="12" fill="#6B7280">Based on your quiz answers</text><text x="32" y="164" font-family="Inter, sans-serif" font-size="12" fill="#6B7280">about scope and goals</text></g><g transform="translate(640 270)"><rect width="230" height="180" rx="20" fill="#0D7377" filter="drop-shadow(0 8px 24px rgba(13,115,119,0.15))"/><text x="115" y="60" text-anchor="middle" font-family="Inter, sans-serif" font-size="40" font-weight="800" fill="#FFFFFF">97%</text><text x="115" y="88" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" fill="#FFFFFF" opacity="0.7">client satisfaction</text><rect x="32" y="112" width="166" height="40" rx="20" fill="#FFFFFF" opacity="0.15"/><text x="115" y="138" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF">See reviews</text></g><g transform="translate(890 270)"><rect width="230" height="180" rx="20" fill="#FFFFFF" filter="drop-shadow(0 4px 16px rgba(0,0,0,0.06))"/><text x="115" y="56" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" fill="#1A1A1A" font-style="italic" opacity="0.6">"Exactly the right scope</text><text x="115" y="76" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" fill="#1A1A1A" font-style="italic" opacity="0.6">for our budget."</text><rect x="32" y="100" width="166" height="1" fill="#E5E7EB"/><text x="115" y="130" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="#0D7377">Sarah K.</text><text x="115" y="150" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#6B7280">Startup founder</text></g></svg>`;

// --- Site-type templates -----------------------------------------------------

const portfolioResult: EmailTemplate = {
  id: 'site-portfolio',
  category: 'post-quiz',
  siteType: 'portfolio',
  title: 'Portfolio: style match',
  oneLiner: 'Tells a photographer or designer which portfolio layout fits their work best.',
  whyQuizNative: 'The recommended layout is derived from answers about their medium, volume, and client type. No broadcast tool knows this.',
  defaultSubject: '{{first_name}}, the layout that fits your work',
  defaultPreheader: 'Based on your answers about your portfolio.',
  mergeTags: ['first_name', 'outcome_name', 'outcome_description', 'quiz_name', 'answer:medium', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_PORTFOLIO, eyebrow: 'YOUR PORTFOLIO MATCH', headline: '{{outcome_name}}', subheadline: 'The layout that shows your work the way it deserves.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'heading-1', type: 'heading', level: 2, text: 'Hi {{first_name}}, we matched your work to a layout.' },
    { id: 'text-1', type: 'text', content: '{{outcome_description}} You told us your primary medium is <strong>{{answer:medium}}</strong>, so we picked a grid and spacing system that lets that format breathe.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'cards-1', type: 'cardGrid', columns: 3, cards: [
      { id: 'c1', title: 'Preview it live', body: 'See the layout with placeholder work before you commit.', ctaLabel: 'Preview', ctaUrl: '{{cta_url}}' },
      { id: 'c2', title: 'Upload your images', body: 'Drag your best 6 pieces in and see the real thing.', ctaLabel: 'Start', ctaUrl: '{{cta_url}}' },
      { id: 'c3', title: 'Need help?', body: 'Reply to this email and our team will help you set up.', ctaLabel: 'Reply', ctaUrl: 'mailto:' },
    ]},
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'See your layout', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const restaurantResult: EmailTemplate = {
  id: 'site-restaurant',
  category: 'post-quiz',
  siteType: 'restaurant',
  title: 'Restaurant: menu style',
  oneLiner: 'Recommends a menu layout and online ordering setup based on the restaurant type.',
  whyQuizNative: 'Menu format, ordering flow, and imagery style are derived from quiz answers about cuisine type and service model.',
  defaultSubject: '{{first_name}}, the menu style that fits your restaurant',
  defaultPreheader: 'Your quiz result from {{quiz_name}}.',
  mergeTags: ['first_name', 'outcome_name', 'outcome_description', 'quiz_name', 'answer:cuisine_type', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_RESTAURANT, eyebrow: 'YOUR MENU MATCH', headline: '{{outcome_name}}', subheadline: 'A menu layout designed for the way your kitchen works.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'heading-1', type: 'heading', level: 2, text: 'Hi {{first_name}}, we picked a layout for your menu.' },
    { id: 'text-1', type: 'text', content: '{{outcome_description}} Since you told us you serve <strong>{{answer:cuisine_type}}</strong>, we chose a format that puts the right photos in the right places and keeps the ordering flow simple for your guests.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'stat-1', type: 'stat', columns: 3, items: [
      { value: '2 min', label: 'Menu setup' },
      { value: 'Mobile', label: 'QR-ready' },
      { value: 'Built-in', label: 'Online orders' },
    ]},
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'Preview your menu', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'divider-1', type: 'divider', style: 'solid' },
    { id: 'test-1', type: 'testimonial', quote: 'We switched to this layout and online orders jumped 40% in the first month.', authorName: 'Chef Maria L.', authorTitle: 'Trattoria Luce', rating: 5 },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const shopResult: EmailTemplate = {
  id: 'site-shop',
  category: 'outcome',
  siteType: 'shop',
  title: 'Shop: product display',
  oneLiner: 'Recommends a product grid and checkout flow based on catalog size and product type.',
  whyQuizNative: 'Grid density, image ratio, and checkout complexity are determined by quiz answers. A broadcast email would show everyone the same layout.',
  defaultSubject: '{{first_name}}, the storefront that fits your catalog',
  defaultPreheader: 'Matched to your {{outcome_name}} result.',
  mergeTags: ['first_name', 'outcome_name', 'outcome_description', 'answer:product_count', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_SHOP, eyebrow: 'YOUR STORE MATCH', headline: '{{outcome_name}}', subheadline: 'A storefront layout matched to your catalog.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'text-1', type: 'text', content: 'Hi {{first_name}}, you told us you have around <strong>{{answer:product_count}}</strong> products. {{outcome_description}} Here is the layout we recommend based on that catalog size.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'cards-1', type: 'cardGrid', columns: 2, cards: [
      { id: 'c1', title: 'Product grid', body: 'See how your products look in the recommended grid density.', ctaLabel: 'Preview', ctaUrl: '{{cta_url}}' },
      { id: 'c2', title: 'Checkout flow', body: 'Test the one-page checkout tuned for your product type.', ctaLabel: 'Try it', ctaUrl: '{{cta_url}}' },
    ]},
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'Set up your store', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'ps-1', type: 'postscript', content: 'P.S. You can switch layouts any time. Start with this one and adjust once your first products are live.' },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const blogResult: EmailTemplate = {
  id: 'site-blog',
  category: 'nurture',
  siteType: 'blog',
  title: 'Blog: content strategy',
  oneLiner: 'Delivers a content plan and blog layout matched to the writer\'s niche and posting cadence.',
  whyQuizNative: 'The blog template, post frequency, and content pillars come from quiz answers about niche and goals. Generic email cannot personalize this.',
  defaultSubject: '{{first_name}}, your content plan is ready',
  defaultPreheader: 'A blog layout and posting cadence matched to your niche.',
  mergeTags: ['first_name', 'outcome_name', 'outcome_description', 'answer:niche', 'answer:posting_frequency', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_BLOG, eyebrow: 'YOUR BLOG PLAN', headline: '{{outcome_name}}', subheadline: 'A layout and cadence built for your writing goals.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'heading-1', type: 'heading', level: 2, text: 'Hi {{first_name}}, here is your content blueprint.' },
    { id: 'text-1', type: 'text', content: '{{outcome_description}} You told us you write about <strong>{{answer:niche}}</strong> and aim to post <strong>{{answer:posting_frequency}}</strong>. We built a layout and first-month calendar around those goals.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'heading-2', type: 'heading', level: 3, text: 'Your first four posts' },
    { id: 'text-2', type: 'text', content: '<strong>1.</strong> The origin story: why you started writing about {{answer:niche}}.<br/><strong>2.</strong> The how-to: one practical thing your reader can do today.<br/><strong>3.</strong> The opinion: a stance that separates you from everyone else.<br/><strong>4.</strong> The roundup: tools or resources you actually use.' },
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'See your blog layout', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'sig-1', type: 'signature', name: 'The content team', message: 'Reply any time. We read every response and will help you get your first post live.' },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const weddingResult: EmailTemplate = {
  id: 'site-wedding',
  category: 'post-quiz',
  siteType: 'wedding',
  title: 'Wedding: site theme',
  oneLiner: 'Picks a wedding site theme based on the couple\'s aesthetic, season, and venue style.',
  whyQuizNative: 'Color palette, typography, and layout are selected from quiz answers about venue and season. A generic tool sends the same theme to everyone.',
  defaultSubject: '{{first_name}}, your wedding site theme is ready',
  defaultPreheader: 'Matched to your style from {{quiz_name}}.',
  mergeTags: ['first_name', 'outcome_name', 'outcome_description', 'quiz_name', 'answer:venue_style', 'answer:season', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_WEDDING, eyebrow: 'YOUR THEME', headline: '{{outcome_name}}', subheadline: 'A wedding site that feels like you two.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'heading-1', type: 'heading', level: 2, text: 'Congratulations, {{first_name}}.' },
    { id: 'text-1', type: 'text', content: '{{outcome_description}} You told us your venue is <strong>{{answer:venue_style}}</strong> and your wedding is in <strong>{{answer:season}}</strong>, so we picked a palette and layout that fits that setting perfectly.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'stat-1', type: 'stat', columns: 3, items: [
      { value: 'RSVP', label: 'Built-in form' },
      { value: 'Registry', label: 'Link included' },
      { value: 'Gallery', label: 'Photo page' },
    ]},
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'Preview your theme', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'ps-1', type: 'postscript', content: 'P.S. You can customize the colors and fonts after you pick the theme. Start here and make it yours.' },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const fitnessResult: EmailTemplate = {
  id: 'site-fitness',
  category: 'outcome',
  siteType: 'fitness',
  title: 'Fitness: program match',
  oneLiner: 'Matches a client to a training program or class schedule based on quiz answers about goals and experience.',
  whyQuizNative: 'Program recommendation is driven by fitness level, goals, and schedule. A generic email blasts the same class to everyone.',
  defaultSubject: '{{first_name}}, your program is picked: {{outcome_name}}',
  defaultPreheader: 'Matched to your fitness goals.',
  mergeTags: ['first_name', 'outcome_name', 'outcome_description', 'answer:fitness_goal', 'answer:experience_level', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_FITNESS, eyebrow: 'YOUR PROGRAM', headline: '{{outcome_name}}', subheadline: 'Matched to your goals and current fitness level.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'heading-1', type: 'heading', level: 2, text: 'Hi {{first_name}}, let\'s get moving.' },
    { id: 'text-1', type: 'text', content: '{{outcome_description}} Your goal is <strong>{{answer:fitness_goal}}</strong> and you told us you are at a <strong>{{answer:experience_level}}</strong> level, so this program scales to where you are right now.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'stat-1', type: 'stat', columns: 3, items: [
      { value: '4x', label: 'Sessions / week' },
      { value: '45 min', label: 'Per session' },
      { value: '8 wks', label: 'Program length' },
    ]},
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'Start your program', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'divider-1', type: 'divider', style: 'solid' },
    { id: 'test-1', type: 'testimonial', quote: 'The quiz matched me to the intermediate program and it was exactly right. I would have picked beginner and wasted a month.', authorName: 'Jake R.', authorTitle: 'Member since 2024', rating: 5 },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const servicesResult: EmailTemplate = {
  id: 'site-services',
  category: 'booking',
  siteType: 'services',
  title: 'Services: package match',
  oneLiner: 'Recommends a service package and booking page layout for consultants, coaches, and freelancers.',
  whyQuizNative: 'The recommended package tier and booking flow are determined by quiz answers about budget, timeline, and scope.',
  defaultSubject: '{{first_name}}, the package that fits your project',
  defaultPreheader: 'Based on your answers: {{outcome_name}}.',
  mergeTags: ['first_name', 'outcome_name', 'outcome_description', 'answer:budget_range', 'answer:timeline', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_SERVICES, eyebrow: 'YOUR PACKAGE MATCH', headline: '{{outcome_name}}', subheadline: 'The right scope for your budget and timeline.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'heading-1', type: 'heading', level: 2, text: 'Hi {{first_name}}, we found the right fit.' },
    { id: 'text-1', type: 'text', content: '{{outcome_description}} You told us your budget is around <strong>{{answer:budget_range}}</strong> and your timeline is <strong>{{answer:timeline}}</strong>, so we picked the package that delivers the most value in that window.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'heading-2', type: 'heading', level: 3, text: 'What is included' },
    { id: 'text-2', type: 'text', content: 'A scoping call to nail down deliverables. Weekly check-ins so nothing drifts. A final review with revisions built in. Everything documented so you own the output.' },
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'Book your scoping call', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'sig-1', type: 'signature', name: 'The {{brand_name}} team', title: 'Here to help', message: 'If the package does not quite fit, reply and we will adjust the scope together.' },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  postQuizWelcome,
  outcomeRecommendation,
  nurtureByAnswer,
  abandonerReengage,
  consultationBooking,
  discountByOutcome,
  portfolioResult,
  restaurantResult,
  shopResult,
  blogResult,
  weddingResult,
  fitnessResult,
  servicesResult,
];

export function getTemplateById(id: string): EmailTemplate | undefined {
  for (var i = 0; i < EMAIL_TEMPLATES.length; i++) {
    if (EMAIL_TEMPLATES[i].id === id) return EMAIL_TEMPLATES[i];
  }
  return undefined;
}

// Keyed category labels for filter chips and gallery headers.
export const CATEGORY_LABELS: Record<string, string> = {
  'post-quiz': 'Post-quiz',
  'outcome': 'By outcome',
  'nurture': 'Nurture',
  'abandoner': 'Abandoner',
  'booking': 'Booking',
  'discount': 'Discount',
};

// Keyed site type labels for filter chips in the gallery.
export const SITE_TYPE_LABELS: Record<string, string> = {
  'portfolio': 'Portfolio',
  'restaurant': 'Restaurant',
  'shop': 'Online store',
  'blog': 'Blog',
  'wedding': 'Wedding',
  'fitness': 'Fitness',
  'services': 'Services',
};
