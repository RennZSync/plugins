/**
 * Hirara AI — WhatsApp Bot
 * Feature : Super Deep Web Recon & Token Scraper (Endpoints, Tokens, Subdomains, IPs, DNS, Secrets & Chunks)
 * Creator : Mommy Kyu
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import dns from 'dns';
import { URL } from 'url';

const dnsLookup = (hostname) => {
	return new Promise((resolve) => {
		dns.lookup(hostname, { all: true }, (err, addresses) => {
			if (err || !addresses) return resolve([]);
			resolve(addresses.map(a => a.address));
		});
	});
};

const dnsResolveMx = (hostname) => {
	return new Promise((resolve) => {
		dns.resolveMx(hostname, (err, addresses) => {
			if (err || !addresses) return resolve([]);
			resolve(addresses.map(a => `${a.exchange} (prio:${a.priority})`));
		});
	});
};

const dnsResolveNs = (hostname) => {
	return new Promise((resolve) => {
		dns.resolveNs(hostname, (err, addresses) => {
			if (err || !addresses) return resolve([]);
			resolve(addresses);
		});
	});
};

const SECRET_PATTERNS = [
	// AI & LLM Providers
	{ name: 'OpenAI API Key', regex: /sk-(?:proj-|live-|admin-|none-)?[a-zA-Z0-9_-]{20,120}/g },
	{ name: 'Anthropic Claude Key', regex: /sk-ant-(?:api\d{2}-)?[a-zA-Z0-9_-]{80,130}/g },
	{ name: 'Google Gemini / AI Studio / Firebase Key', regex: /AIza[0-9A-Za-z-_]{35}/g },
	{ name: 'Groq API Key', regex: /gsk_[a-zA-Z0-9]{48,64}/g },
	{ name: 'HuggingFace Token', regex: /hf_[a-zA-Z0-9]{34,50}/g },
	{ name: 'Cohere API Key', regex: /co-[a-zA-Z0-9]{40}/g },
	{ name: 'Perplexity API Key', regex: /pplx-[a-zA-Z0-9]{48}/g },
	{ name: 'DeepSeek API Key', regex: /sk-[a-zA-Z0-9]{32}/g },
	{ name: 'Mistral AI API Key', regex: /[a-zA-Z0-9]{32}(?=\s*(?:mistral|MISTRAL))/g },
	{ name: 'Replicate API Token', regex: /r8_[a-zA-Z0-9]{36,40}/g },
	{ name: 'Together AI Key', regex: /[a-f0-9]{64}(?=\s*(?:together|TOGETHER))/gi },
	{ name: 'AssemblyAI Token', regex: /[0-9a-f]{32}(?=\s*(?:assembly|ASSEMBLY))/gi },
	{ name: 'ElevenLabs API Key', regex: /[a-f0-9]{32}(?=\s*(?:elevenlabs|xi-api-key))/gi },

	// Cloud, Hosting & Server Infrastructure
	{ name: 'AWS Access Key ID', regex: /(?:AKIA|ASIA|AROA|A3T)[0-9A-Z]{16}/g },
	{ name: 'AWS Secret Access Key', regex: /(?:aws_secret_access_key|aws_secret_key|secret_key|aws_secret)\s*[:=]\s*['"]([A-Za-z0-9/+=]{40})['"]/gi, group: 1 },
	{ name: 'Amazon S3 Bucket / ARN', regex: /(?:https?:\/\/[a-zA-Z0-9.\-_]+\.s3(?:\.[a-zA-Z0-9.\-_]+)?\.amazonaws\.com|s3:\/\/[a-zA-Z0-9.\-_]+|arn:aws:s3:::[a-zA-Z0-9.\-_]+)/gi },
	{ name: 'Google OAuth Client ID', regex: /[0-9]+-[a-z0-9_]{10,}\.apps\.googleusercontent\.com/gi },
	{ name: 'Google OAuth Client Secret', regex: /(?:client_secret|g_secret)\s*[:=]\s*['"]([a-zA-Z0-9_-]{24,35})['"]/gi, group: 1 },
	{ name: 'Google Cloud Platform Service Account Key', regex: /"type":\s*"service_account",\s*"project_id":\s*"[^"]+"/g },
	{ name: 'Firebase Database URL', regex: /https:\/\/[a-zA-Z0-9_-]+\.firebaseio\.com/gi },
	{ name: 'Firebase Storage URL', regex: /https?:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[a-zA-Z0-9_.-]+/gi },
	{ name: 'DigitalOcean Personal Token', regex: /dop_v1_[a-f0-9]{64}/gi },
	{ name: 'DigitalOcean Spaces Key', regex: /(?:DO[A-Z0-9]{18})/g },
	{ name: 'Cloudflare API Token', regex: /cfat_[a-zA-Z0-9_-]{40,}/gi },
	{ name: 'Cloudflare Global Key / Zone ID', regex: /(?:cf_api_key|cf_key|cf_token|cfzone|cloudflare_zone)\s*[:=]\s*['"]([a-f0-9]{32,45})['"]/gi, group: 1 },
	{ name: 'Cloudflare Pages / Workers URL', regex: /https:\/\/[a-zA-Z0-9_-]+\.(?:pages\.dev|workers\.dev)/gi },
	{ name: 'Vercel Token', regex: /vercel_[a-zA-Z0-9_-]{24,}/gi },
	{ name: 'Netlify Access Token', regex: /nfp_[a-zA-Z0-9]{40,60}/gi },
	{ name: 'Pterodactyl Client / App API Key', regex: /ptl[ac]_[a-zA-Z0-9_-]{40,}/gi },

	// Supabase & Backend Anon / Service Keys
	{ name: 'Supabase Project URL', regex: /https:\/\/[a-z0-9-]+\.supabase\.co/gi },
	{ name: 'Supabase Anon / Service Role Key', regex: /(?:anon[_-]?key|service[_-]?role[_-]?key|supabase[_-]?(?:key|anon|service))\s*[:=]\s*['"](eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})['"]/gi, group: 1 },
	{ name: 'Supabase / PostgREST JWT (Anon / Service Token)', regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g },
	{ name: 'Explicit Anon Key Assignment', regex: /(?:anon_key|anonKey|ANON_KEY|public_anon_key|NEXT_PUBLIC_SUPABASE_ANON_KEY|VITE_SUPABASE_ANON_KEY)\s*[:=]\s*['"]([a-zA-Z0-9_\-\.\:\@\$\#\%\&\*\+\/\=]{20,250})['"]/gi, group: 1 },

	// Source Code & Version Control
	{ name: 'GitHub Personal Access Token (Classic / Fine-Grained)', regex: /(?:gh[pousr]_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{22,})/g },
	{ name: 'GitHub OAuth Access Token', regex: /gho_[A-Za-z0-9_]{36,}/g },
	{ name: 'GitLab Personal Access Token', regex: /glpat-[a-zA-Z0-9_-]{20,}/g },
	{ name: 'Bitbucket App Password / Client Secret', regex: /(?:bitbucket_secret|bitbucket_key)\s*[:=]\s*['"]([a-zA-Z0-9_-]{32})['"]/gi, group: 1 },
	{ name: 'NPM Access Token', regex: /npm_[a-zA-Z0-9]{36}/g },

	// Chat, Social & Messaging
	{ name: 'Telegram Bot Token', regex: /[0-9]{8,11}:[a-zA-Z0-9_-]{35}/g },
	{ name: 'Discord Webhook URL', regex: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/gi },
	{ name: 'Discord Bot Token', regex: /(?:[A-Za-z\d]{24,26}\.[\w-]{6}\.[\w-]{27,38}|mfa\.[\w-]{84})/g },
	{ name: 'Slack Webhook URL', regex: /https:\/\/hooks\.slack__.com\/services\/T[0-9a-zA-Z]+\/B[0-9a-zA-Z]+\/[0-9a-zA-Z]+/gi },
	{ name: 'Slack Bot / User Token', regex: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/gi },
	{ name: 'WhatsApp Cloud API / Graph Token', regex: /EAAG[a-zA-Z0-9_-]{50,}/g },

	// Payment Gateways & Banking
	{ name: 'Stripe Secret / Public / Restricted Key', regex: /(?:sk|pk|rk)_(?:live|test)_[0-9a-zA-Z]{24,}/g },
	{ name: 'Midtrans Server / Client Key', regex: /(?:SB-Mid-server-|Mid-server-|SB-Mid-client-|Mid-client-)[a-zA-Z0-9_-]{20,}/gi },
	{ name: 'Xendit Secret / Public Key', regex: /xnd_(?:development|production|public)_[a-zA-Z0-9_-]{20,}/gi },
	{ name: 'Tripay API Key / Private Key', regex: /(?:DEV-T[0-9]+|TRIPAY-[0-9a-zA-Z]+|[a-zA-Z0-9]{5,}-[a-zA-Z0-9]{5,}-[a-zA-Z0-9]{5,}-[a-zA-Z0-9]{5,})/gi },
	{ name: 'Duitku Merchant Code / Key', regex: /(?:duitku[_-]?(?:key|secret|code))\s*[:=]\s*['"]([a-zA-Z0-9]{32})['"]/gi, group: 1 },
	{ name: 'PayPal Braintree Access Token', regex: /access_token\$production\$[0-9a-z]{16}\$[0-9a-f]{32}/gi },
	{ name: 'Square Access Token', regex: /sq0atp-[0-9A-Za-z\-_]{22}/g },
	{ name: 'Square OAuth Secret', regex: /sq0csp-[0-9A-Za-z\-_]{43}/g },
	{ name: 'Razorpay Key ID & Secret', regex: /rzp_(?:live|test)_[a-zA-Z0-9]{14}/g },

	// Communications & Mail
	{ name: 'SendGrid API Key', regex: /SG\.[0-9a-zA-Z_-]{22}\.[0-9a-zA-Z_-]{43}/g },
	{ name: 'Mailgun API Key', regex: /key-[0-9a-zA-Z]{32}/gi },
	{ name: 'Twilio Account SID', regex: /AC[a-f0-9]{32}/gi },
	{ name: 'Twilio Auth Token', regex: /(?:twilio[_-]?auth[_-]?token|twilio[_-]?secret)\s*[:=]\s*['"]([a-f0-9]{32})['"]/gi, group: 1 },
	{ name: 'Resend API Key', regex: /re_[a-zA-Z0-9]{24,40}/g },
	{ name: 'Postmark Server Token', regex: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\s*(?:postmark|POSTMARK))/gi },

	// Databases, Caches & Search
	{ name: 'Database URI (Mongo, Postgres, MySQL, Redis, MS SQL)', regex: /(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|mariadb|sqlite|mssql|cassandra|clickhouse):\/\/[^\s'"<>`]+/gi },
	{ name: 'Algolia Admin / App / Search Key', regex: /(?:algolia[_-]?(?:api[_-]?key|admin[_-]?key|app[_-]?id))\s*[:=]\s*['"]([a-zA-Z0-9]{32})['"]/gi, group: 1 },
	{ name: 'Meilisearch Master Key', regex: /(?:meili[_-]?master[_-]?key|meilisearch[_-]?key)\s*[:=]\s*['"]([a-zA-Z0-9_-]{32,})['"]/gi, group: 1 },
	{ name: 'Elasticsearch Cloud ID & Basic Auth', regex: /(?:elastic[_-]?cloud[_-]?id|elasticsearch[_-]?key)\s*[:=]\s*['"]([a-zA-Z0-9_-]{30,})['"]/gi, group: 1 },
	{ name: 'Upstash Redis / QStash Token', regex: /(?:upstash_redis_rest_token|qstash_token)\s*[:=]\s*['"]([a-zA-Z0-9_.-]{40,})['"]/gi, group: 1 },

	// Cryptographic & BEGIN Keys (Private, Public, Certificates, OpenSSH, PGP)
	{ name: 'RSA / DSA / EC Private Key', regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g },
	{ name: 'Public Key / Public Certificate', regex: /-----BEGIN (?:PUBLIC KEY|CERTIFICATE|RSA PUBLIC KEY)-----[\s\S]+?-----END (?:PUBLIC KEY|CERTIFICATE|RSA PUBLIC KEY)-----/g },
	{ name: 'PGP Private / Public Key Block', regex: /-----BEGIN PGP (?:PRIVATE|PUBLIC) KEY BLOCK-----[\s\S]+?-----END PGP (?:PRIVATE|PUBLIC) KEY BLOCK-----/g },
	{ name: 'SSH Authorized Key / Private Key', regex: /ssh-(?:rsa|dss|ed25519)\s+[A-Za-z0-9+/=]{40,}/g },

	// General Secrets, Tokens & Keys
	{ name: 'JSON Web Token (JWT)', regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
	{ name: 'Mapbox API Token', regex: /[ps]k\.[a-zA-Z0-9._-]{60,}/g },
	{ name: 'Google Maps / Places API Key', regex: /AIzaSy[A-Za-z0-9_-]{33}/g },
	{ name: 'Sentry DSN URL', regex: /https:\/\/[a-f0-9]{32}@(?:o\d+\.)?ingest(?:\.us)?\.sentry\.io\/\d+/gi },
	{ name: 'Datadog API / App Key', regex: /(?:datadog[_-]?api[_-]?key|dd[_-]?api[_-]?key)\s*[:=]\s*['"]([a-f0-9]{32})['"]/gi, group: 1 },
	{ name: 'Bearer Token Authorization Header', regex: /Bearer\s+([a-zA-Z0-9_.-]{25,})/gi, group: 1 },
	{ name: 'Basic Auth Header String', regex: /Basic\s+([a-zA-Z0-9+/=]{20,})/gi, group: 1 },
	{ name: 'Environment Secret Variable Assignment', regex: /(?:^|\n|\s*)(?:VITE_|NEXT_PUBLIC_|REACT_APP_|SECRET_|PRIVATE_|API_|TOKEN_|PASSWORD_|AUTH_|DB_|ANON_|KEY_)[A-Z0-9_]{3,35}\s*=\s*['"]?([a-zA-Z0-9_\-\.\:\@\$\#\%\&\*\+\/\=]{8,250})['"]?/g, group: 1 },
	{ name: 'Generic API Key / Secret Assignment', regex: /(?:api[_-]?key|apikey|access[_-]?token|auth[_-]?token|secret[_-]?key|client[_-]?secret|private[_-]?key|app[_-]?secret|bearer[_-]?token|auth[_-]?key|session[_-]?secret|encryption[_-]?key|db[_-]?password|master[_-]?key|signing[_-]?secret|anon[_-]?key|service[_-]?key)\s*[:=]\s*['"]([a-zA-Z0-9_\-\.\:\@\$\#\%\&\*\+\/\=]{8,200})['"]/gi, group: 1 }
];

const ENDPOINT_PATTERNS = [
	// Explicit AJAX / Fetch / Axios calls
	/(?:fetch|axios(?:\.get|\.post|\.put|\.delete|\.patch)?|\$\.ajax|\$\.get|\$\.post)\s*\(\s*['"`]([^'"`\s\)\>]+)['"`]/gi,
	// Relative API & System Paths
	/(?:https?:\/\/[a-zA-Z0-9.-]+)?(?:\/api|\/v\d+|\/graphql|\/rest|\/oauth|\/auth|\/webhook|\/admin|\/user|\/users|\/login|\/register|\/config|\/settings|\/data|\/ws|\/socket\.io|\/panel|\/server|\/gateway|\/ajax|\/routes|\/download|\/upload|\/cron)[a-zA-Z0-9_\-\/\.\?\=\&\#\%]*/gi
];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const IP_PATTERN = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;

const extractMatches = (text, regex, groupIndex = 0) => {
	const matches = new Set();
	let match;
	const r = new RegExp(regex);
	while ((match = r.exec(text)) !== null) {
		const val = groupIndex > 0 ? match[groupIndex] : match[0];
		if (val && typeof val === 'string' && val.trim().length > 0) {
			const clean = val.trim();
			if (!clean.includes('example.com') && !clean.includes('username:password') && clean.length <= 400) {
				matches.add(clean);
			}
		}
	}
	return Array.from(matches);
};

// Fetch subdomains from crt.sh and hackerTarget
const fetchSubdomains = async (rootDomain) => {
	const subdomains = new Set();
	try {
		// 1. crt.sh Certificate Transparency
		const crtRes = await axios.get(`https://crt.sh/?q=%25.${rootDomain}&output=json`, { timeout: 8000 }).catch(() => null);
		if (crtRes && Array.isArray(crtRes.data)) {
			crtRes.data.forEach(item => {
				if (item && item.name_value) {
					const names = item.name_value.split('\n');
					names.forEach(n => {
						const clean = n.trim().toLowerCase().replace(/^\*\./, '');
						if (clean.endsWith(rootDomain) && clean.length <= 80 && !clean.includes(' ')) {
							subdomains.add(clean);
						}
					});
				}
			});
		}
	} catch (_) {}

	try {
		// 2. HackerTarget Host Search
		const htRes = await axios.get(`https://api.hackertarget.com/hostsearch/?q=${rootDomain}`, { timeout: 8000 }).catch(() => null);
		if (htRes && typeof htRes.data === 'string' && !htRes.data.includes('error')) {
			const lines = htRes.data.split('\n');
			lines.forEach(l => {
				const [host] = l.split(',');
				if (host && host.includes(rootDomain)) {
					subdomains.add(host.trim().toLowerCase());
				}
			});
		}
	} catch (_) {}

	return Array.from(subdomains);
};

// IP Geolocation / ISP Information
const getIpInfo = async (ip) => {
	try {
		const res = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,isp,org,as,query`, { timeout: 4000 }).catch(() => null);
		if (res && res.data && res.data.status === 'success') {
			return res.data;
		}
	} catch (_) {}
	return null;
};

const handler = async (m, { sock, conn, text, args, usedPrefix, command, reply }) => {
	const client = sock || conn || global.mainSock;
	let target = args[0] || (m.quoted ? (m.quoted.text || '') : text);

	if (!target) {
		return reply(
			`🔍 *SUPER DEEP WEB, IP, SUBDOMAIN & RECON SCRAPER*\n\n` +
			`Format: *${usedPrefix + command} <url / domain / text>*\n` +
			`Contoh: *${usedPrefix + command} https://api.kyzzz.xyz*\n` +
			`Atau: *${usedPrefix + command} google.com*\n\n` +
			`Fitur ini mengekstrak secara otomatis & menyeluruh:\n` +
			`• 🌐 *IP & Server Info:* DNS records, Host IP, ISP & AS Network\n` +
			`• 🌍 *Subdomain Enumeration:* Deteksi seluruh subdomain terdaftar & inline\n` +
			`• 🔑 *Semua Token AI:* OpenAI, Claude, Gemini, Groq, DeepSeek, dll\n` +
			`• ☁️ *Cloud Keys:* AWS, Firebase, Cloudflare, Supabase, Pterodactyl\n` +
			`• 💳 *Payment Gateway:* Stripe, Midtrans, Tripay, Xendit, PayPal\n` +
			`• 🐙 *Git & Messaging:* GitHub, Telegram, Discord, Slack\n` +
			`• 🛣️ *API Endpoints & Paths:* Routing paths & API functions\n` +
			`• 📦 *Webpack / Next.js / Vite Chunks:* Analisis kode bundle JS`
		);
	}

	let targetUrl = '';
	let rawInputText = '';
	let hostname = '';
	const urlMatch = target.match(/https?:\/\/[^\s]+/i);

	if (urlMatch) {
		targetUrl = urlMatch[0];
		try { hostname = new URL(targetUrl).hostname; } catch (_) {}
	} else if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/.*)?$/i.test(target.trim())) {
		targetUrl = `https://${target.trim()}`;
		try { hostname = new URL(targetUrl).hostname; } catch (_) {}
	} else {
		// Input is raw text / source snippet
		rawInputText = target;
	}

	await global.react(client, m, 'loading');

	try {
		let allText = '';
		let scriptList = [];
		let parsedUrl = null;
		let hostIps = [];
		let mxRecords = [];
		let nsRecords = [];
		let subdomainsList = [];
		let ipGeoInfo = null;

		if (targetUrl) {
			parsedUrl = new URL(targetUrl);
			hostname = parsedUrl.hostname;
			await reply(`⏳ *Memulai Deep Recon, IP Lookup & Subdomain Crawling...*\nTarget: \`${targetUrl}\`\nHost: \`${hostname}\`\nMohon tunggu beberapa detik...`);

			// Root domain calculation for subdomains
			const domainParts = hostname.split('.');
			const rootDomain = domainParts.length >= 2 ? domainParts.slice(-2).join('.') : hostname;

			// Parallel DNS & Subdomains Recon
			const [ips, mx, ns, subs] = await Promise.all([
				dnsLookup(hostname),
				dnsResolveMx(hostname),
				dnsResolveNs(hostname),
				fetchSubdomains(rootDomain)
			]);

			hostIps = ips;
			mxRecords = mx;
			nsRecords = ns;
			subdomainsList = subs;

			if (hostIps.length > 0) {
				ipGeoInfo = await getIpInfo(hostIps[0]);
			}

			const axiosInstance = axios.create({
				timeout: 25000,
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					'Accept-Language': 'en-US,en;q=0.5'
				}
			});

			// 1. Fetch Main Page
			const response = await axiosInstance.get(targetUrl);
			const html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
			const $ = cheerio.load(html);

			// 2. Discover all linked scripts & chunk modules
			const scriptUrls = new Set();
			$('script[src]').each((_, el) => {
				const src = $(el).attr('src');
				if (src) {
					try { scriptUrls.add(new URL(src, targetUrl).href); } catch (_) {}
				}
			});

			$('link[rel="modulepreload"], link[rel="preload"][as="script"]').each((_, el) => {
				const href = $(el).attr('href');
				if (href) {
					try { scriptUrls.add(new URL(href, targetUrl).href); } catch (_) {}
				}
			});

			// Scan Next.js __NEXT_DATA__ / Nuxt / Vite chunk manifests
			const inlineChunks = html.match(/(?:static\/chunks\/[a-zA-Z0-9_-]+\.js|_nuxt\/[a-zA-Z0-9_-]+\.js|assets\/[a-zA-Z0-9_-]+\.js)/gi) || [];
			inlineChunks.forEach(chunk => {
				try { scriptUrls.add(new URL(chunk, targetUrl).href); } catch (_) {}
			});

			scriptList = Array.from(scriptUrls).slice(0, 30);

			// 3. Fetch linked scripts concurrently
			const scriptContents = await Promise.all(
				scriptList.map(async (u) => {
					try {
						const res = await axiosInstance.get(u, { responseType: 'text' });
						return typeof res.data === 'string' ? res.data : '';
					} catch (_) {
						return '';
					}
				})
			);

			allText = [html, ...scriptContents].join('\n');

			// Also scan subdomains mentioned inside inline HTML/JS
			const inlineSubRegex = new RegExp(`https?:\/\/([a-zA-Z0-9.-]+\\.${rootDomain.replace('.', '\\.')})`, 'gi');
			const inlineSubs = extractMatches(allText, inlineSubRegex, 1);
			inlineSubs.forEach(s => {
				if (s && !subdomainsList.includes(s.toLowerCase())) {
					subdomainsList.push(s.toLowerCase());
				}
			});
		} else {
			allText = rawInputText;
			await reply(`⏳ *Memulai Scanning Snippet / Teks...*`);
		}

		// 4. Extract Secrets & Tokens
		const foundTokens = {};
		for (const pat of SECRET_PATTERNS) {
			const matches = extractMatches(allText, pat.regex, pat.group || 0);
			if (matches.length > 0) {
				foundTokens[pat.name] = matches;
			}
		}

		// 5. Extract Paths & Endpoints
		const pathMatches = new Set();
		for (const pRegex of ENDPOINT_PATTERNS) {
			const matches = extractMatches(allText, pRegex, 1);
			const matchesFull = extractMatches(allText, pRegex, 0);
			[...matches, ...matchesFull].forEach(p => {
				if (p && typeof p === 'string' && p.length > 1 && !p.startsWith('//')) {
					let cleaned = p.trim();
					if (cleaned.startsWith('http')) {
						try { cleaned = new URL(cleaned).pathname; } catch (_) {}
					}
					if (cleaned.startsWith('/') && cleaned.length > 2 && !cleaned.includes(' ') && !cleaned.includes('<')) {
						pathMatches.add(cleaned);
					}
				}
			});
		}
		const cleanedPaths = Array.from(pathMatches).slice(0, 150);

		// 6. Extract Emails & IPs from contents
		const emails = extractMatches(allText, EMAIL_PATTERN).slice(0, 20);
		const inlineIps = extractMatches(allText, IP_PATTERN).filter(ip => !ip.startsWith('127.') && !ip.startsWith('0.') && !ip.startsWith('255.')).slice(0, 20);

		let totalTokensCount = 0;
		for (const items of Object.values(foundTokens)) {
			totalTokensCount += items.length;
		}

		// 7. Format Output Summary
		let report = `🔍 *HASIL DEEP RECON & SCRAPER*\n`;
		report += `🌐 *Target:* ${targetUrl || 'Raw Source / Snippet'}\n`;
		if (hostname) report += `🏷️ *Host:* \`${hostname}\`\n`;
		if (hostIps.length > 0) report += `🖥️ *Server IP:* \`${hostIps.join(', ')}\`\n`;
		if (ipGeoInfo) report += `📍 *Lokasi/ISP:* ${ipGeoInfo.city || ''}, ${ipGeoInfo.country || ''} (${ipGeoInfo.isp || ipGeoInfo.org || 'Unknown'})\n`;
		if (subdomainsList.length > 0) report += `🌍 *Subdomains Ditemukan:* ${subdomainsList.length} sub\n`;
		if (targetUrl) report += `📦 *Scripts Di-crawl:* ${scriptList.length + 1} file (HTML + JS Chunks)\n`;
		report += `🔑 *Secrets/Tokens:* ${totalTokensCount}\n`;
		report += `🛣️ *Endpoints/Paths:* ${cleanedPaths.length}\n`;
		report += `────────────────────────────────\n\n`;

		// Subdomains Section
		if (subdomainsList.length > 0) {
			report += `🌍 *SUBDOMAINS ENUMERATION (Top ${Math.min(15, subdomainsList.length)}):*\n`;
			subdomainsList.slice(0, 15).forEach((sub, idx) => {
				report += `  ${idx + 1}. \`${sub}\`\n`;
			});
			if (subdomainsList.length > 15) report += `  ...dan ${subdomainsList.length - 15} subdomain lainnya.\n`;
			report += `\n────────────────────────────────\n\n`;
		}

		// Server & DNS Section
		if (hostIps.length > 0 || mxRecords.length > 0 || nsRecords.length > 0) {
			report += `📡 *DNS & NETWORK RECORDS:*\n`;
			if (hostIps.length > 0) report += ` ├ 🖥️ *Host IP:* ${hostIps.join(', ')}\n`;
			if (nsRecords.length > 0) report += ` ├ 🏷️ *NS:* ${nsRecords.slice(0, 4).join(', ')}\n`;
			if (mxRecords.length > 0) report += ` └ ✉️ *MX:* ${mxRecords.slice(0, 3).join(', ')}\n`;
			report += `\n────────────────────────────────\n\n`;
		}

		// Tokens Section
		if (totalTokensCount > 0) {
			report += `🔐 *TOKENS & CREDENTIALS DIKENALI:*\n`;
			for (const [name, items] of Object.entries(foundTokens)) {
				report += `\n📌 *${name}* (${items.length}):\n`;
				items.slice(0, 8).forEach((t, i) => {
					report += `  [${i + 1}] \`${t}\`\n`;
				});
				if (items.length > 8) report += `  ...dan ${items.length - 8} lainnya\n`;
			}
			report += `\n────────────────────────────────\n\n`;
		} else {
			report += `🔐 *TOKENS & SECRETS:* Tidak ada token publik yang terekspos langsung.\n\n`;
		}

		// Endpoints Section
		if (cleanedPaths.length > 0) {
			report += `🛣️ *API ENDPOINTS & PATHS (Top ${Math.min(20, cleanedPaths.length)}):*\n`;
			cleanedPaths.slice(0, 20).forEach((p, idx) => {
				report += `  ${idx + 1}. \`${p}\`\n`;
			});
			if (cleanedPaths.length > 20) report += `  ...dan ${cleanedPaths.length - 20} endpoint lainnya.\n`;
			report += `\n────────────────────────────────\n\n`;
		}

		// Emails & Inline IPs
		if (emails.length > 0 || inlineIps.length > 0) {
			report += `📧 *CONTACTS & DETECTED IPS:* \n`;
			if (emails.length > 0) report += ` ├ ✉️ *Emails:* ${emails.join(', ')}\n`;
			if (inlineIps.length > 0) report += ` └ 🌐 *IPs:* ${inlineIps.slice(0, 10).join(', ')}\n`;
			report += `\n────────────────────────────────\n\n`;
		}

		// Linked Scripts
		if (scriptList.length > 0) {
			report += `📦 *CHUNKS & SCRIPTS ASSETS (Top 5):*\n`;
			scriptList.slice(0, 5).forEach((s, idx) => {
				report += `  ${idx + 1}. ${s}\n`;
			});
			if (scriptList.length > 5) report += `  ...dan ${scriptList.length - 5} asset lainnya.\n`;
		}

		report += `\n꒰ © Hirara AI • Security & Dev Recon ꒱`;

		// Deliver results
		if (report.length <= 3800 && totalTokensCount <= 15 && cleanedPaths.length <= 30 && subdomainsList.length <= 20) {
			await reply(report);
		} else {
			// Generate detailed file report
			let fullFileContent = `====================================================\n`;
			fullFileContent += `  SUPER DEEP RECON & SCRAPER REPORT - HIRARA AI\n`;
			fullFileContent += `  Target URL  : ${targetUrl || 'Raw Snippet'}\n`;
			if (hostname) fullFileContent += `  Hostname    : ${hostname}\n`;
			if (hostIps.length > 0) fullFileContent += `  Host IPs    : ${hostIps.join(', ')}\n`;
			if (ipGeoInfo) {
				fullFileContent += `  ISP / Org   : ${ipGeoInfo.isp} (${ipGeoInfo.org || ''})\n`;
				fullFileContent += `  Location    : ${ipGeoInfo.city}, ${ipGeoInfo.regionName}, ${ipGeoInfo.country}\n`;
				fullFileContent += `  AS Number   : ${ipGeoInfo.as}\n`;
			}
			fullFileContent += `  Scanned At  : ${new Date().toISOString()}\n`;
			fullFileContent += `  Subdomains  : ${subdomainsList.length}\n`;
			fullFileContent += `  Secrets     : ${totalTokensCount}\n`;
			fullFileContent += `  Endpoints   : ${cleanedPaths.length}\n`;
			fullFileContent += `  JS Chunks   : ${scriptList.length}\n`;
			fullFileContent += `====================================================\n\n`;

			if (subdomainsList.length > 0) {
				fullFileContent += `[+] ENUMERATED SUBDOMAINS (${subdomainsList.length})\n`;
				fullFileContent += `----------------------------------------------------\n`;
				subdomainsList.forEach(sub => { fullFileContent += ` - ${sub}\n`; });
				fullFileContent += `\n\n`;
			}

			if (hostIps.length > 0 || nsRecords.length > 0 || mxRecords.length > 0) {
				fullFileContent += `[+] DNS & NETWORK INFRASTRUCTURE\n`;
				fullFileContent += `----------------------------------------------------\n`;
				if (hostIps.length > 0) fullFileContent += ` - Host IP(s) : ${hostIps.join(', ')}\n`;
				if (nsRecords.length > 0) fullFileContent += ` - NS Record  : ${nsRecords.join(', ')}\n`;
				if (mxRecords.length > 0) fullFileContent += ` - MX Record  : ${mxRecords.join(', ')}\n`;
				fullFileContent += `\n\n`;
			}

			fullFileContent += `[+] FOUND SECRETS & TOKENS (${totalTokensCount})\n`;
			fullFileContent += `----------------------------------------------------\n`;
			for (const [name, items] of Object.entries(foundTokens)) {
				fullFileContent += `\n[Category: ${name}] (${items.length})\n`;
				items.forEach(t => { fullFileContent += ` - ${t}\n`; });
			}

			fullFileContent += `\n\n[+] API ENDPOINTS & PATHS (${cleanedPaths.length})\n`;
			fullFileContent += `----------------------------------------------------\n`;
			cleanedPaths.forEach(p => { fullFileContent += ` - ${p}\n`; });

			if (emails.length > 0 || inlineIps.length > 0) {
				fullFileContent += `\n\n[+] CONTACTS & EXTRACTED NETWORK IPS\n`;
				fullFileContent += `----------------------------------------------------\n`;
				emails.forEach(e => { fullFileContent += ` - Email : ${e}\n`; });
				inlineIps.forEach(ip => { fullFileContent += ` - IP    : ${ip}\n`; });
			}

			fullFileContent += `\n\n[+] SCANNED SCRIPTS & CHUNKS (${scriptList.length})\n`;
			fullFileContent += `----------------------------------------------------\n`;
			scriptList.forEach(s => { fullFileContent += ` - ${s}\n`; });

			const fileBuffer = Buffer.from(fullFileContent, 'utf-8');
			const hostClean = hostname ? hostname.replace(/[^a-zA-Z0-9.-]/g, '_') : 'recon';
			const docFileName = `recon_${hostClean}_${Date.now()}.txt`;

			await client.sendMessage(m.chat, {
				document: fileBuffer,
				mimetype: 'text/plain',
				fileName: docFileName,
				caption: `📊 *Hasil Deep Recon Lengkap:* \`${hostname || targetUrl || 'Target'}\`\nTotal: ${subdomainsList.length} Subdomains, ${hostIps.length} Host IPs, ${totalTokensCount} Secrets & ${cleanedPaths.length} Endpoints terlampir di file atas.`
			}, { quoted: m });
		}

		await global.react(client, m, 'success');
	} catch (err) {
		console.error('[SUPER SCRAPE ERROR]:', err);
		await global.react(client, m, 'error');
		return reply(`❌ Gagal melakukan deep scrape:\n${err.message || err}`);
	}
};

handler.help = ['scrape <url / domain>'];
handler.tags = ['tools'];
handler.command = ['scrape'];
handler.limit = true;
handler.register = true;

export default handler;
