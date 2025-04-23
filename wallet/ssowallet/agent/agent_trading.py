import os
import time
import logging
import asyncio
import random
import threading
from decimal import Decimal
from datetime import datetime, timedelta
from dotenv import load_dotenv
from crypto_com_agent_client import Agent, tool
from web3 import Web3
from agent_swap import (
    approve_VUSD,
    swap_VUSD_to_WZKCRO,
    unwrap_WZKCRO,
    deposit_zkCRO,
    approve_WZKCRO,
    swap_WZKCRO_to_VUSD,
    fetch_session_config,
    CHAIN,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get interval from environment or use default
SEND_INTERVAL_SECONDS = int(os.getenv("SEND_INTERVAL_SECONDS", "10"))

# Global variables for thread control
trading_thread = None
stop_trading_flag = False


class PriceSimulator:
    """Simulates zkCRO price movements for testing"""

    def __init__(self, initial_price=1.0, volatility=0.02):
        self.current_price = initial_price
        self.volatility = volatility
        self.price_history = []

    def get_current_price(self):
        """Simulates price movement with random walk"""
        change = random.uniform(-self.volatility, self.volatility)
        self.current_price *= 1 + change

        # Store price in history
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.price_history.append({"timestamp": timestamp, "price": self.current_price})

        # Keep only last 100 prices
        if len(self.price_history) > 100:
            self.price_history.pop(0)

        return self.current_price

    def get_price_history(self):
        """Returns price history"""
        return self.price_history


class TradingBot:
    def __init__(self):
        # Trading parameters
        self.trade_amount = 1.0  # amount to trade each time

        # Initialize price simulator
        self.price_simulator = PriceSimulator(
            initial_price=1.0, volatility=0.02  # Start at $1  # 2% volatility
        )

        # Trading state
        self.last_trade_type = None

        # Mock balances (for testing)
        self.zkcro_balance = 100.0
        self.vusd_balance = 100.0

    def print_status(self, current_price):
        """Print current status"""
        logger.info("-" * 50)
        logger.info(f"Current zkCRO price: ${current_price:.4f}")
        logger.info(
            f"Balances - zkCRO: {self.zkcro_balance:.2f}, VUSD: ${self.vusd_balance:.2f}"
        )
        logger.info(
            f"Last trade: {self.last_trade_type}"
            if self.last_trade_type
            else "No trades yet"
        )
        logger.info("-" * 50)

    def generate_mock_trading_data(self, current_price):
        """Generate mock trading data for agent analysis"""
        current_time = datetime.now()

        # Generate mock price history - 10 points with 5-minute intervals
        time_series_data = []
        base_price = current_price
        for i in range(9, -1, -1):
            # Generate timestamp 5 minutes apart using timedelta
            point_time = current_time - timedelta(minutes=i * 5)

            # Generate price with small random variations (±2%)
            variation = random.uniform(-0.02, 0.02)
            point_price = base_price * (1 + variation)

            # Update base price for next iteration to create a somewhat continuous movement
            base_price = point_price

            time_series_data.append(
                f"{point_time.strftime('%Y-%m-%d %H:%M:%S')}: ${round(point_price, 4)}"
            )

        # Calculate volume and market indicators (mock data)
        mock_volume = random.uniform(10000, 50000)
        mock_market_cap = current_price * 1000000  # Assuming 1M total supply

        trading_data = {
            "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
            "market_data": {
                "current_price_usd": round(current_price, 4),
                "24h_volume_usd": round(mock_volume, 2),
                "market_cap_usd": round(mock_market_cap, 2),
            },
            "price_history": time_series_data,
            "wallet_state": {
                "zkcro_balance": round(self.zkcro_balance, 2),
                "vusd_balance": round(self.vusd_balance, 2),
            },
            "trading_state": {
                "last_trade": self.last_trade_type or "none",
                "last_trade_time": (
                    current_time.strftime("%Y-%m-%d %H:%M:%S")
                    if self.last_trade_type
                    else "n/a"
                ),
            },
        }

        # Convert to formatted string
        data_str = (
            f"you are crypto trading agent, you are given the market data and you need to decide whether to buy or sell zkCRO based on the market data and your strategy."
            f"use the following data to make your decision:\n"
            f"=== zkCRO Market Analysis ===\n"
            f"Time: {trading_data['timestamp']}\n\n"
            f"Price History (Last 10 points - 5min intervals):\n"
            + "\n".join(trading_data["price_history"])
            + f"\n\nMarket Overview:\n"
            f"Current Price: ${trading_data['market_data']['current_price_usd']}\n"
            f"24h Volume: ${trading_data['market_data']['24h_volume_usd']:,.2f}\n"
            f"Market Cap: ${trading_data['market_data']['market_cap_usd']:,.2f}\n\n"
            f"Wallet Status:\n"
            f"zkCRO Balance: {trading_data['wallet_state']['zkcro_balance']}\n"
            f"VUSD Balance: ${trading_data['wallet_state']['vusd_balance']}\n\n"
            f"Trading Status:\n"
            f"Last Trade: {trading_data['trading_state']['last_trade']}\n"
            f"Last Trade Time: {trading_data['trading_state']['last_trade_time']}\n\n"
            f"=== your strategy ===\n"
            f"if you need to buy zkcro, call execute_buy(0.1)\n"
            f"and if you need to sell zkcro, call execute_sell(0.1)\n"
        )
        return data_str

    async def trading_loop(self):
        """Main trading loop that runs until stop signal is received"""
        global stop_trading_flag, agent

        while not stop_trading_flag:
            try:
                # Get current price and generate trading data
                current_price = self.price_simulator.get_current_price()
                self.print_status(current_price)

                # Generate trading data and get agent's analysis
                trading_data = self.generate_mock_trading_data(current_price)
                response = agent.interact(trading_data)
                logger.info(f"Agent response: {response}")

                # Sleep for the configured interval
                await asyncio.sleep(SEND_INTERVAL_SECONDS)

            except Exception as e:
                logger.error(f"Error in trading iteration: {str(e)}")
                await asyncio.sleep(
                    SEND_INTERVAL_SECONDS
                )  # Use configured interval on error

        logger.info("Trading loop stopped due to stop signal")


def run_trading_loop():
    """Function to run trading bot in a loop"""
    global stop_trading_flag
    bot = TradingBot()

    while not stop_trading_flag:
        try:
            # Run one iteration of the trading loop
            asyncio.run(bot.trading_loop())
            # Sleep for the configured interval
            time.sleep(SEND_INTERVAL_SECONDS)
        except Exception as e:
            logger.error(f"Error in trading loop: {str(e)}")
            # Even on error, respect the interval
            time.sleep(SEND_INTERVAL_SECONDS)


@tool
def execute_buy(amount: float) -> str:
    """
    Execute a buy order for the given amount of zkCRO.
    Returns a status message.
    """
    logger.info("💰 ═══════ EXECUTING BUY ORDER ═══════ 💰")
    logger.info(f"Amount: {amount} zkCRO")
    logger.info("═════════════════════════════════════════")
    return asyncio.run(do_execute_buy(amount))


async def do_execute_buy(amount: float) -> str:
    """
    Execute a buy order for the given amount of zkCRO by swapping VUSD to zkCRO.
    Returns a status message.
    """
    try:
        # Initialize Web3
        web3 = Web3(Web3.HTTPProvider(CHAIN["rpcUrls"]["default"]["http"][0]))

        # Get session configuration
        session_config = fetch_session_config(
            web3,
            os.getenv("SSO_WALLET_ADDRESS"),
            os.getenv("SSO_WALLET_SESSION_PUBKEY"),
        )

        # Execute VUSD -> zkCRO swap
        await approve_VUSD(web3, session_config, amount)
        await swap_VUSD_to_WZKCRO(web3, session_config, amount)
        await unwrap_WZKCRO(web3, session_config, amount)

        return f"Buy order executed successfully for {amount} zkCRO!"
    except Exception as e:
        error_msg = f"Error executing buy order: {str(e)}"
        logger.error(error_msg)
        return error_msg


@tool
def execute_sell(amount: float) -> str:
    """
    Execute a sell order for the given amount of zkCRO.
    Returns a status message.
    """
    logger.info("💸 ═══════ EXECUTING SELL ORDER ═══════ 💸")
    logger.info(f"Amount: {amount} zkCRO")
    logger.info("═════════════════════════════════════════")
    return asyncio.run(do_execute_sell(amount))


async def do_execute_sell(amount: float) -> str:
    """
    Execute a sell order for the given amount of zkCRO by swapping zkCRO to VUSD.
    Returns a status message.
    """
    try:

        # Initialize Web3
        web3 = Web3(Web3.HTTPProvider(CHAIN["rpcUrls"]["default"]["http"][0]))

        # Get session configuration
        session_config = fetch_session_config(
            web3,
            os.getenv("SSO_WALLET_ADDRESS"),
            os.getenv("SSO_WALLET_SESSION_PUBKEY"),
        )

        # Execute zkCRO -> VUSD swap
        await deposit_zkCRO(web3, session_config, amount)
        await approve_WZKCRO(web3, session_config, amount)
        await swap_WZKCRO_to_VUSD(web3, session_config, amount)

        return f"Sell order executed successfully for {amount} zkCRO!"
    except Exception as e:
        error_msg = f"Error executing sell order: {str(e)}"
        logger.error(error_msg)
        return error_msg


def start_trading(tool_input: str = "") -> str:
    """
    Start the trading bot in a thread.
    Returns a status message.
    """
    global trading_thread, stop_trading_flag

    local_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Check if thread is already running
    if trading_thread is not None and trading_thread.is_alive():
        return f"Trading bot is already running.\nLocal time: {local_time}"

    try:
        # Start the trading thread
        stop_trading_flag = False
        trading_thread = threading.Thread(target=run_trading_loop, daemon=True)
        trading_thread.start()
        return f"Trading bot started successfully.\nLocal time: {local_time}"
    except Exception as e:
        return f"Error starting trading bot: {str(e)}\nLocal time: {local_time}"


@tool
def stop_trading(tool_input: str = "") -> str:
    """
    Stop the trading bot thread.
    Returns a status message.
    """
    global trading_thread, stop_trading_flag

    local_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if trading_thread is None or not trading_thread.is_alive():
        return f"No trading bot is running.\nLocal time: {local_time}"

    try:
        # Stop the trading thread
        stop_trading_flag = True
        trading_thread.join(timeout=5)
        trading_thread = None
        return f"Trading bot stopped successfully.\nLocal time: {local_time}"
    except Exception as e:
        return f"Error stopping trading bot: {str(e)}\nLocal time: {local_time}"


@tool
def get_status(tool_input: str = "") -> str:
    """
    Get current market status and trading information.
    Returns formatted market data and trading status.
    """
    try:
        bot = TradingBot()
        current_price = bot.price_simulator.get_current_price()
        status_data = bot.generate_mock_trading_data(current_price)
        logger.info("📊 ═══════ Current Market Status ═══════ 📊")
        logger.info(f"{status_data}")
        logger.info("═════════════════════════════════════════")
        return f"Market status retrieved successfully!"
    except Exception as e:
        error_msg = f"Error getting status: {str(e)}"
        logger.error(error_msg)
        return error_msg


# Initialize the agent with trading tools
agent = Agent.init(
    llm_config={
        "provider": "OpenAI",
        "model": "gpt-4o-mini",
        "provider-api-key": os.getenv("OPENAI_API_KEY"),
    },
    blockchain_config={
        "chainId": "240",
        "explorer-api-key": os.getenv("EXPLORER_API_KEY"),
        "private-key": os.getenv("PRIVATE_KEY"),
        "sso-wallet-url": "your-sso-wallet-url",
    },
    plugins={
        "tools": [start_trading, stop_trading, execute_buy, execute_sell, get_status],
    },
)


def main():
    print("🤖 Welcome to the Crypto Trading Bot Interface! 🚀")
    print("\n📋 Available Commands:")
    print("  • 📈 start trading - Begin automated trading")
    print("  • 🛑 stop trading - Stop the trading bot")
    print("  • 📊 get status - View current market data (mock)")
    print("  • 💰 buy <amount> - Execute buy order")
    print("  • 💸 sell <amount> - Execute sell order")
    print("\n❌ Type 'exit' or 'quit' to end session")
    print("=" * 50)

    while True:
        # Get user input
        logger.info("═════════════════════════════════════════")
        user_input = input("\nYou: ").strip()

        # Check for exit command
        if user_input.lower() in ["exit", "quit"]:
            # Make sure to stop trading if active
            if trading_thread is not None and trading_thread.is_alive():
                stop_trading("")
            print("\nGoodbye!")
            break

        # Get response from agent
        try:
            response = agent.interact(user_input)
            print("\nAgent:", response)
        except Exception as e:
            print("\nError:", str(e))
            print("Please try again.")


if __name__ == "__main__":
    main()
