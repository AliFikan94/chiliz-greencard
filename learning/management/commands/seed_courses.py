import random

from django.core.management.base import BaseCommand
from django.db import transaction

from learning.models import Choice, Experience, Journey

# The 7-course core curriculum. Content is deliberately conceptual and
# evergreen (no prices, dates, or named partners that go stale) so it stays
# accurate without upkeep. Each course must be passed with a 100% score
# (every question right, first try, in one run) to unlock the next.
COURSES = [
    {
        "slug": "chiliz-basics",
        "title": "Chiliz Basics",
        "description": "What Chiliz is, and where it fits in sports and entertainment.",
        "questions": [
            {
                "title": "What is Chiliz?",
                "hook": "Every ecosystem starts with a foundation.",
                "story": "Chiliz is a blockchain ecosystem built specifically for sports "
                "and entertainment fan engagement, powering Fan Tokens for clubs "
                "and organizations around the world.",
                "question": "What best describes Chiliz?",
                "reveal": "Chiliz is a blockchain ecosystem purpose-built for sports and "
                "entertainment fan engagement.",
                "correct": "A blockchain ecosystem built for sports and entertainment fan engagement",
                "wrong": [
                    "A social media app for sports fans",
                    "A physical trading card game",
                    "A traditional stock exchange",
                ],
            },
            {
                "title": "What is CHZ?",
                "hook": "One token powers the whole ecosystem.",
                "story": "CHZ is the native utility token of the Chiliz ecosystem - it's "
                "used for transaction fees and to interact with the platform, "
                "separate from any single club's own Fan Token.",
                "question": "What is CHZ?",
                "reveal": "CHZ is the native utility token used across the Chiliz ecosystem.",
                "correct": "The native utility token used across the Chiliz ecosystem",
                "wrong": [
                    "A fan token for one specific football club",
                    "A stablecoin pegged to the US dollar",
                    "An NFT collection",
                ],
            },
            {
                "title": "Who uses Fan Tokens?",
                "hook": "Fan Tokens exist for one group: fans.",
                "story": "Fan Tokens issued through the Chiliz ecosystem are built for "
                "supporters of sports clubs and esports organizations who want a "
                "more active connection to the teams they follow.",
                "question": "Who typically uses Fan Tokens issued via the Chiliz ecosystem?",
                "reveal": "Fans of sports clubs and esports organizations use Fan Tokens "
                "to engage more directly with the teams they support.",
                "correct": "Fans of sports clubs and esports organizations",
                "wrong": [
                    "Only professional day traders",
                    "Government agencies",
                    "Airlines",
                ],
            },
            {
                "title": "Chiliz's focus",
                "hook": "Not every blockchain tries to do everything.",
                "story": "Chiliz has deliberately focused its ecosystem on one industry: "
                "sports and entertainment, rather than trying to serve every "
                "possible use case.",
                "question": "What sector has Chiliz focused its ecosystem around?",
                "reveal": "Chiliz is focused on sports and entertainment.",
                "correct": "Sports and entertainment",
                "wrong": ["Agriculture", "Healthcare", "Real estate"],
            },
        ],
    },
    {
        "slug": "fan-tokens-101",
        "title": "Fan Tokens 101",
        "description": "What owning a Fan Token actually gets you.",
        "questions": [
            {
                "title": "What a Fan Token unlocks",
                "hook": "Fan Tokens turn support into participation.",
                "story": "Holding a club's Fan Token typically lets a fan take part in "
                "official polls about club-related decisions, and can unlock "
                "perks, badges, or experiences tied to that club.",
                "question": "What does owning a Fan Token typically let a fan do?",
                "reveal": "It lets fans take part in club-related polls and unlock fan perks.",
                "correct": "Take part in club-related polls and unlock fan perks",
                "wrong": [
                    "Automatically become a shareholder of the club",
                    "Guarantee a spot on the team roster",
                    "Replace a season ticket entirely",
                ],
            },
            {
                "title": "What polls actually decide",
                "hook": "Fan votes matter - within limits.",
                "story": "Fan Token polls are usually about fan-facing, non-critical "
                "decisions - things like matchday graphics, song choices, or "
                "commemorative merchandise - not core team operations.",
                "question": "Fan Token voting polls usually let fans influence:",
                "reveal": "Minor, fan-facing decisions - like graphics or matchday details "
                "- not core team operations.",
                "correct": "Minor club decisions, like graphics on gear or matchday features",
                "wrong": [
                    "Player transfer contracts",
                    "Referee appointments",
                    "League broadcasting rights",
                ],
            },
            {
                "title": "Fan Tokens vs. shares",
                "hook": "A common mix-up worth clearing up.",
                "story": "A Fan Token is a fan-engagement token, not equity. Holding one "
                "doesn't make you an owner of the club or entitle you to profits, "
                "unlike a share of stock.",
                "question": "Are Fan Tokens the same as owning equity/shares in a club?",
                "reveal": "No - Fan Tokens are fan engagement tokens, not equity or shares.",
                "correct": "No - they're a fan engagement token, not equity",
                "wrong": [
                    "Yes, identical to shares",
                    "Yes, but only for esports clubs",
                    "Only for clubs based in Europe",
                ],
            },
            {
                "title": "Every club, its own token",
                "hook": "Fan Tokens aren't one-size-fits-all.",
                "story": "Each participating club or organization has its own distinct "
                "Fan Token and community - a supporter of one club holds a "
                "completely separate token from a supporter of another.",
                "question": "Each club or organization that issues a Fan Token generally has:",
                "reveal": "Its own distinct token and community, separate from every other club's.",
                "correct": "Its own distinct token and community",
                "wrong": [
                    "The exact same token as every other club",
                    "No control over its own token",
                    "A token that expires after one season",
                ],
            },
        ],
    },
    {
        "slug": "the-socios-platform",
        "title": "The Socios Platform",
        "description": "How fans actually use Socios day to day.",
        "questions": [
            {
                "title": "What Socios is for",
                "hook": "Fan Tokens need a home.",
                "story": "Socios.com and the Socios app are where fans buy, hold, and use "
                "Fan Tokens - voting in polls, redeeming rewards, and engaging "
                "with the clubs they support.",
                "question": "What is Socios.com / the Socios app primarily used for?",
                "reveal": "Buying, holding, and using Fan Tokens, plus engaging with "
                "rewards and experiences.",
                "correct": "Buying, holding, and using Fan Tokens, and engaging with rewards and experiences",
                "wrong": [
                    "Streaming live matches only",
                    "Booking sports tickets and hotels",
                    "Trading traditional stocks",
                ],
            },
            {
                "title": "Redeeming rewards",
                "hook": "Points can turn into real perks.",
                "story": "Fans can often redeem rewards through Socios - things like "
                "exclusive merchandise, once-in-a-lifetime experiences, or "
                "VIP-style perks tied to their favorite clubs.",
                "question": "What kind of rewards might a fan redeem through Socios?",
                "reveal": "Exclusive merchandise, experiences, and VIP-style perks.",
                "correct": "Exclusive merchandise, experiences, and VIP-style perks",
                "wrong": [
                    "Guaranteed cash refunds",
                    "Free equity in the club",
                    "Citizenship in the club's home country",
                ],
            },
            {
                "title": "Who can vote in a poll",
                "hook": "Participation has one clear requirement.",
                "story": "To take part in a specific club's poll on Socios, a fan "
                "generally needs to hold that club's Fan Token - it's the key "
                "that unlocks participation.",
                "question": "To participate in a club poll on Socios, a fan generally needs to:",
                "reveal": "Hold that club's Fan Token.",
                "correct": "Hold that club's Fan Token",
                "wrong": [
                    "Live in the same city as the club",
                    "Be a registered journalist",
                    "Own a season ticket",
                ],
            },
            {
                "title": "The bridge between fans and clubs",
                "hook": "Socios describes its own role simply.",
                "story": "Socios positions itself as a direct bridge between fans and the "
                "clubs and organizations they support, rather than a general "
                "sports media or ticketing platform.",
                "question": "Socios positions itself as a platform connecting:",
                "reveal": "Fans directly with the clubs and organizations they support.",
                "correct": "Fans directly with the clubs and organizations they support",
                "wrong": [
                    "Only professional athletes with each other",
                    "Banks with regulators",
                    "Advertisers with each other",
                ],
            },
        ],
    },
    {
        "slug": "wallets-and-self-custody",
        "title": "Wallets & Self-Custody",
        "description": "Owning crypto safely starts here.",
        "questions": [
            {
                "title": "What a wallet actually is",
                "hook": "It doesn't hold coins the way you think.",
                "story": "A crypto wallet doesn't store your assets like a physical "
                "pouch - it holds the keys that prove and control ownership of "
                "assets recorded onchain.",
                "question": "What is a crypto wallet?",
                "reveal": "A tool that holds the keys controlling your onchain assets.",
                "correct": "A tool that holds the keys controlling your onchain assets",
                "wrong": ["A physical bank vault", "A credit card", "A government-issued ID"],
            },
            {
                "title": "Why self-custody matters",
                "hook": "With great control comes great responsibility.",
                "story": "Self-custody means you - not an exchange or company - control "
                "your assets directly. It's powerful, but it also means you're "
                "responsible for keeping your keys safe.",
                "question": "Why does self-custody matter?",
                "reveal": "You alone control your assets, without depending on a third party.",
                "correct": "You alone control your assets, without depending on a third party",
                "wrong": [
                    "It makes transactions completely free",
                    "It automatically reverses mistakes",
                    "It's required by every government",
                ],
            },
            {
                "title": "The one rule that matters most",
                "hook": "If you remember only one thing from this course...",
                "story": "Your seed phrase (or private key) is the master key to your "
                "wallet. Anyone who has it can take everything - so it should "
                "never be shared, typed into a website, or shown on a stream.",
                "question": "What should you NEVER share with anyone?",
                "reveal": "Your seed phrase / private key.",
                "correct": "Your seed phrase / private key",
                "wrong": [
                    "Your public wallet address",
                    "The name of your favorite club",
                    "Your Fan Token balance",
                ],
            },
            {
                "title": "Losing your seed phrase",
                "hook": "There's no customer support hotline for this.",
                "story": "Unlike a bank password, a lost seed phrase with no backup "
                "usually can't be recovered by anyone - not even the wallet "
                "provider. That's the tradeoff of true self-custody.",
                "question": "If you lose your seed phrase and have no backup, what typically happens?",
                "reveal": "You permanently lose access to that wallet's funds.",
                "correct": "You permanently lose access to that wallet's funds",
                "wrong": [
                    "Customer support can always recover it instantly",
                    "The funds automatically transfer to a backup wallet",
                    "Nothing changes",
                ],
            },
        ],
    },
    {
        "slug": "chiliz-chain-and-evm",
        "title": "Chiliz Chain & EVM",
        "description": "The tech underneath the fan experience.",
        "questions": [
            {
                "title": "EVM-compatible, explained",
                "hook": "A shared standard makes life easier for builders.",
                "story": "Chiliz Chain is EVM-compatible, meaning it supports the same "
                "smart contract tooling and standards popularized by Ethereum - "
                "so familiar developer tools work with it too.",
                "question": "What does 'EVM-compatible' mean for a blockchain like Chiliz Chain?",
                "reveal": "It supports the same smart contract tooling and standards as Ethereum.",
                "correct": "It supports the same smart contract tooling and standards as Ethereum",
                "wrong": [
                    "It only runs on Ethereum's own servers",
                    "It has nothing to do with smart contracts",
                    "It means the chain can't be audited",
                ],
            },
            {
                "title": "Paying for transactions",
                "hook": "Every transaction needs gas.",
                "story": "On Chiliz Chain, network fees (gas) are paid in CHZ, the "
                "chain's native token - just like ETH is used to pay gas on "
                "Ethereum.",
                "question": "On Chiliz Chain, transaction (gas) fees are typically paid in:",
                "reveal": "CHZ.",
                "correct": "CHZ",
                "wrong": [
                    "US Dollars",
                    "Every club's Fan Token equally",
                    "Nothing - fees don't exist",
                ],
            },
            {
                "title": "What a testnet is for",
                "hook": "Practice before it counts.",
                "story": "A testnet, like Chiliz's Spicy testnet, is a separate network "
                "using worthless test tokens - it lets developers and users try "
                "things safely before touching real funds on mainnet.",
                "question": "What is a testnet (like Chiliz Spicy) used for?",
                "reveal": "Testing apps and contracts safely before using real funds on mainnet.",
                "correct": "Testing apps and contracts safely before using real funds on mainnet",
                "wrong": [
                    "Running the only official production app",
                    "Storing users' real savings",
                    "Replacing mainnet entirely",
                ],
            },
            {
                "title": "The language of smart contracts",
                "hook": "Every ecosystem has its own toolkit.",
                "story": "Smart contracts on EVM-compatible chains - including Chiliz "
                "Chain - are most commonly written in Solidity, a language "
                "designed specifically for this purpose.",
                "question": "Smart contracts on an EVM-compatible chain are commonly written in:",
                "reveal": "Solidity.",
                "correct": "Solidity",
                "wrong": [
                    "Microsoft Excel formulas",
                    "Plain HTML",
                    "SQL only",
                ],
            },
        ],
    },
    {
        "slug": "nfts-and-digital-collectibles",
        "title": "NFTs & Digital Collectibles",
        "description": "Digital ownership, made verifiable.",
        "questions": [
            {
                "title": "What makes an NFT an NFT",
                "hook": "Not all tokens are interchangeable.",
                "story": "An NFT (non-fungible token) is a unique, verifiable digital "
                "token that represents ownership of a specific item - unlike a "
                "currency, no two NFTs are automatically identical or interchangeable.",
                "question": "What is an NFT?",
                "reveal": "A unique, verifiable digital token representing ownership of a specific item.",
                "correct": "A unique, verifiable digital token representing ownership of a specific item",
                "wrong": [
                    "A type of cryptocurrency you can mine",
                    "A physical trading card only",
                    "A password manager",
                ],
            },
            {
                "title": "NFTs in sports and entertainment",
                "hook": "Digital memorabilia, reimagined.",
                "story": "In sports and entertainment, NFTs are often used as digital "
                "collectibles, memorabilia, or keys that unlock fan experiences "
                "and perks.",
                "question": "In sports and entertainment, NFTs are often used for:",
                "reveal": "Digital collectibles, memorabilia, and unlockable fan experiences.",
                "correct": "Digital collectibles, memorabilia, and unlockable fan experiences",
                "wrong": [
                    "Replacing players on the field",
                    "Setting league schedules",
                    "Issuing government IDs",
                ],
            },
            {
                "title": "NFT vs. a regular image",
                "hook": "The difference isn't the picture.",
                "story": "You could screenshot an NFT's image, but that copy wouldn't "
                "carry the verifiable ownership record - that record living "
                "onchain is what actually makes an NFT distinct.",
                "question": "What makes an NFT different from a regular image file?",
                "reveal": "Its ownership and authenticity are recorded onchain.",
                "correct": "Its ownership and authenticity are recorded onchain",
                "wrong": [
                    "It can't be viewed in a browser",
                    "It has no owner at all",
                    "It's always more expensive than a photo",
                ],
            },
            {
                "title": "Value within a collection",
                "hook": "Not every item in a set is equal.",
                "story": "Even within the same NFT collection, individual items can "
                "carry different traits or rarity - so their value doesn't have "
                "to be identical.",
                "question": "Can two different NFTs from the same collection be worth the same amount?",
                "reveal": "Not necessarily - each one can have its own distinct value.",
                "correct": "Not necessarily - each one can have its own distinct value",
                "wrong": [
                    "They're always worth exactly the same",
                    "NFTs never have value",
                    "Only the first NFT ever minted has value",
                ],
            },
        ],
    },
    {
        "slug": "governance-and-onchain-utility",
        "title": "Governance & Onchain Utility",
        "description": "Where your Greencard finally comes together.",
        "questions": [
            {
                "title": "What onchain governance means",
                "hook": "Voting, made verifiable.",
                "story": "Onchain governance means using blockchain-recorded votes to "
                "help make decisions - the vote itself, and its outcome, are "
                "stored transparently on the chain.",
                "question": "What does 'onchain governance' generally mean?",
                "reveal": "Using blockchain-recorded votes to help make decisions.",
                "correct": "Using blockchain-recorded votes to help make decisions",
                "wrong": [
                    "A government agency controlling the blockchain",
                    "Decisions made only by a single CEO in secret",
                    "Governance that has nothing to do with voting",
                ],
            },
            {
                "title": "Why record votes onchain",
                "hook": "Trust, without needing to trust anyone.",
                "story": "Recording a vote onchain creates a transparent, tamper-resistant "
                "record that anyone can independently verify - no need to trust "
                "a single party's spreadsheet.",
                "question": "Why record a vote onchain instead of a private database?",
                "reveal": "It creates a transparent, tamper-resistant record anyone can verify.",
                "correct": "It creates a transparent, tamper-resistant record anyone can verify",
                "wrong": [
                    "It hides the results from everyone",
                    "It makes the vote reversible at any time by one person",
                    "It has no benefit over a spreadsheet",
                ],
            },
            {
                "title": "What 'utility' really means",
                "hook": "A token is more than a price chart.",
                "story": "A token's utility is what holders can actually do with it - "
                "vote in polls, redeem rewards, unlock access - not just its "
                "market price.",
                "question": "'Utility' of a token generally refers to:",
                "reveal": "What holders can actually do with it - vote, redeem rewards, access perks.",
                "correct": "What holders can actually do with it - vote, redeem rewards, access perks",
                "wrong": [
                    "Only its resale price",
                    "Whether it has a logo",
                    "How many people follow it on social media",
                ],
            },
            {
                "title": "What your Greencard represents",
                "hook": "You made it to the last question.",
                "story": "Passing all seven core courses and earning your Chiliz "
                "Greencard is a milestone: proof you understand the fundamentals "
                "of the Chiliz Web3 ecosystem, from Fan Tokens to onchain governance.",
                "question": "Completing all core courses and earning your Chiliz Greencard represents:",
                "reveal": "A milestone showing you understand the fundamentals of the "
                "Chiliz Web3 ecosystem.",
                "correct": "A milestone showing you understand the fundamentals of the Chiliz Web3 ecosystem",
                "wrong": [
                    "Legal citizenship of any country",
                    "A guaranteed financial return",
                    "Ownership of Chiliz the company",
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Seeds (or updates) the 7-course core Chiliz Academy curriculum."

    def handle(self, *args, **options):
        with transaction.atomic():
            for course_index, course in enumerate(COURSES, start=1):
                journey, _ = Journey.objects.update_or_create(
                    slug=course["slug"],
                    defaults={
                        "title": course["title"],
                        "description": course["description"],
                        "order": course_index,
                        "is_published": True,
                    },
                )

                for question_index, question in enumerate(course["questions"], start=1):
                    experience, _ = Experience.objects.update_or_create(
                        journey=journey,
                        slug=f"{course['slug']}-q{question_index}",
                        defaults={
                            "title": question["title"],
                            "order": question_index,
                            "hook": question["hook"],
                            "story": question["story"],
                            "question": question["question"],
                            "reveal": question["reveal"],
                            "xp_reward": 10,
                            "is_published": True,
                        },
                    )

                    experience.choices.all().delete()
                    all_choices = [question["correct"], *question["wrong"]]
                    random.shuffle(all_choices)
                    for choice_index, text in enumerate(all_choices):
                        Choice.objects.create(
                            experience=experience,
                            text=text,
                            order=choice_index,
                            is_correct=(text == question["correct"]),
                        )

                self.stdout.write(f"  {course_index}. {course['title']} ({len(course['questions'])} questions)")

        self.stdout.write(self.style.SUCCESS(f"Seeded {len(COURSES)} core courses."))
