# Veloran — submission description

Veloran is the payment and access layer for the agent economy: sellers publish paid APIs, dataset-shaped payloads, and premium content that humans and AI agents unlock with USDC on Solana.

The problem is simple: premium digital resources are still sold through checkout flows, subscriptions, API keys, and enterprise contracts built for human buyers. But AI agents increasingly read content and call APIs directly. They need a machine-readable way to discover a price, pay, and receive the response without a human in the loop.

Pay.sh and Cloudflare Pay-Per-Crawl validate the direction: machine traffic is becoming payable traffic. Veloran focuses on the seller side of that stack. Independent analysts, researchers, data curators, and indie API builders can publish once, set a USDC price, and get a URL that supports both checkout and agent payment.

Humans unlock through Privy email login or Phantom wallet checkout. Agents call the same resource through an HTTP 402 flow, receive payment instructions, sign a Solana transaction, and re-request with an `X-PAYMENT` header. The server verifies the on-chain payment before returning the gated JSON or content.

Veloran’s core moat is settlement. A custom Anchor program on Solana enforces the 95/5 seller/platform split atomically in one SPL-token transaction: 95% directly to the seller, 5% to Veloran. No facilitator custody, no clearing period, and every payment is auditable on Solscan.

Publish once. Humans pay with checkout. Agents pay with HTTP 402. Sellers get paid directly on-chain.
