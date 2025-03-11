## Installation
1. Install dependencies:
```bash
yarn
```

2. Build the project:
```bash
yarn build
```

After building, the executable will be available at `./dist/index.js` for Python integration.

## Environment Setup
1. Copy the environment template:
```bash
cp .env.example .env
```

2. Configure the following variables in `.env`:
```
OPENAI_API_KEY=           # Your OpenAI API key
EXPLORER_API_KEY=         # Your Explorer API key

# SSO Wallet Configuration
SSO_WALLET_SESSION_KEY=0x    # Session key
SSO_WALLET_SESSION_PUBKEY=0x # Session public key
SSO_WALLET_ADDRESS=0x        # Wallet address
TARGET_ADDRESS=0x            # Target address for transactions
SEND_INTERVAL_SECONDS=       # Interval between sends in seconds
```

Note: You can obtain these values from the SSO wallet web example.

## Usage
1. Load environment variables:
```bash
source .env
```

2. Start the application:
```bash
python app.py
```

3. Available commands:
   - To start periodic transfers: `run sso wallet`
   - To stop transfers: `stop sso wallet`

The application will automatically send transactions at intervals specified by `SEND_INTERVAL_SECONDS`.


