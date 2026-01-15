import { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { getRedis } from "../../utils/redis.js";

/**
 * x402 Payment Protocol Middleware
 *
 * Implements the x402 payment protocol for API monetization.
 * When payment is required, returns HTTP 402 with payment instructions.
 * When valid payment is provided, allows the request to proceed.
 *
 * @see https://x402.org
 */

// x402 payment configuration
export interface X402Config {
  /** Amount to charge in USD cents (e.g., 10 = $0.10) */
  amountCents: number;
  /** USDC receiver address */
  receiverAddress: string;
  /** Network for payment (default: Base) */
  network?: string;
  /** Asset for payment (default: USDC) */
  asset?: string;
  /** Whether to require payment (can be disabled for free tier) */
  enabled?: boolean;
  /** Custom description for payment */
  description?: string;
}

// Payment requirement returned in 402 response
export interface PaymentRequirement {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  outputSchema?: object;
  extra?: Record<string, any>;
}

// Payment payload from client
export interface PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    signature: string;
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
    };
  };
}

// Default configuration
const DEFAULT_CONFIG: Partial<X402Config> = {
  network: "eip155:8453", // Base mainnet
  asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  enabled: true,
};

// Header names
const PAYMENT_HEADER = "x-payment";
const PAYMENT_RESPONSE_HEADER = "x-payment-response";

// USDC has 6 decimals
const USDC_DECIMALS = 6;

/**
 * Convert cents to USDC amount string
 */
function centsToUsdcAmount(cents: number): string {
  // USDC has 6 decimals, so $0.10 = 100000 (0.10 * 10^6)
  const amount = BigInt(cents) * BigInt(10 ** (USDC_DECIMALS - 2));
  return amount.toString();
}

/**
 * Verify payment signature and authorization
 * In production, this would call the x402 facilitator's /verify endpoint
 */
async function verifyPayment(
  payment: PaymentPayload,
  config: X402Config
): Promise<{ valid: boolean; error?: string }> {
  try {
    const { authorization } = payment.payload;

    // Verify basic fields
    if (authorization.to.toLowerCase() !== config.receiverAddress.toLowerCase()) {
      return { valid: false, error: "Invalid receiver address" };
    }

    const requiredAmount = BigInt(centsToUsdcAmount(config.amountCents));
    const providedAmount = BigInt(authorization.value);

    if (providedAmount < requiredAmount) {
      return { valid: false, error: "Insufficient payment amount" };
    }

    // Check validity window
    const now = Math.floor(Date.now() / 1000);
    const validAfter = parseInt(authorization.validAfter);
    const validBefore = parseInt(authorization.validBefore);

    if (now < validAfter) {
      return { valid: false, error: "Payment not yet valid" };
    }

    if (now > validBefore) {
      return { valid: false, error: "Payment expired" };
    }

    // Check if nonce was already used (replay protection)
    const redis = getRedis();
    const nonceKey = `x402:nonce:${authorization.from}:${authorization.nonce}`;
    const used = await redis.get(nonceKey);

    if (used) {
      return { valid: false, error: "Nonce already used" };
    }

    // In production, call the x402 facilitator's /verify endpoint:
    // const verifyResponse = await fetch('https://x402.org/verify', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payment),
    // });
    // const result = await verifyResponse.json();
    // if (!result.valid) return { valid: false, error: result.error };

    // Mark nonce as used (expires after validBefore + buffer)
    const ttl = validBefore - now + 3600; // 1 hour buffer
    await redis.setex(nonceKey, ttl, "1");

    return { valid: true };
  } catch (error) {
    console.error("[x402] Payment verification error:", error);
    return { valid: false, error: "Payment verification failed" };
  }
}

/**
 * Settle the payment with the facilitator
 * In production, this would call the x402 facilitator's /settle endpoint
 */
async function settlePayment(_payment: PaymentPayload): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
}> {
  try {
    // In production, call the x402 facilitator's /settle endpoint:
    // const settleResponse = await fetch('https://x402.org/settle', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(_payment),
    // });
    // return await settleResponse.json();

    // For now, return success (actual settlement happens on-chain)
    return {
      success: true,
      txHash: `0x${Date.now().toString(16)}`, // Mock tx hash
    };
  } catch (error) {
    console.error("[x402] Payment settlement error:", error);
    return { success: false, error: "Payment settlement failed" };
  }
}

/**
 * Create x402 payment middleware
 */
export function x402Middleware(config: X402Config) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return createMiddleware(async (c: Context, next: Next) => {
    // Skip if payments disabled
    if (!finalConfig.enabled) {
      await next();
      return;
    }

    // Check for payment header
    const paymentHeader = c.req.header(PAYMENT_HEADER);

    if (!paymentHeader) {
      // No payment provided - return 402 with payment requirements
      const requirement: PaymentRequirement = {
        scheme: "exact",
        network: finalConfig.network!,
        maxAmountRequired: centsToUsdcAmount(finalConfig.amountCents),
        resource: c.req.url,
        description:
          finalConfig.description ||
          `Payment required: $${(finalConfig.amountCents / 100).toFixed(2)}`,
        mimeType: "application/json",
        payTo: finalConfig.receiverAddress,
        maxTimeoutSeconds: 300, // 5 minutes
        asset: finalConfig.asset!,
      };

      c.status(402);
      c.header("Content-Type", "application/json");
      c.header(
        "X-Payment-Required",
        JSON.stringify({
          x402Version: 1,
          accepts: [requirement],
          error: "Payment required to access this resource",
        })
      );

      return c.json({
        error: "Payment required",
        code: "PAYMENT_REQUIRED",
        accepts: [requirement],
      });
    }

    // Payment provided - verify it
    let payment: PaymentPayload;
    try {
      payment = JSON.parse(
        Buffer.from(paymentHeader, "base64").toString("utf-8")
      );
    } catch {
      throw new HTTPException(400, {
        message: "Invalid payment header format",
      });
    }

    // Verify the payment
    const verification = await verifyPayment(payment, finalConfig);

    if (!verification.valid) {
      throw new HTTPException(402, {
        message: verification.error || "Payment verification failed",
      });
    }

    // Settle the payment (in background, don't block request)
    settlePayment(payment).then((result) => {
      if (!result.success) {
        console.error("[x402] Settlement failed:", result.error);
      } else {
        console.log("[x402] Payment settled:", result.txHash);
      }
    });

    // Add payment response header
    c.header(
      PAYMENT_RESPONSE_HEADER,
      JSON.stringify({
        success: true,
        network: payment.network,
        payer: payment.payload.authorization.from,
        amount: payment.payload.authorization.value,
      })
    );

    // Store payment info in context for logging
    c.set("x402Payment" as any, {
      payer: payment.payload.authorization.from,
      amount: payment.payload.authorization.value,
      network: payment.network,
    });

    await next();
  });
}

/**
 * Create x402 middleware for sweep API ($0.10 per call)
 */
export const sweepPaymentMiddleware = (receiverAddress: string) =>
  x402Middleware({
    amountCents: 10, // $0.10
    receiverAddress,
    description: "Piggy Bank sweep execution fee",
  });

/**
 * Create x402 middleware for quote API (free or small fee)
 */
export const quotePaymentMiddleware = (
  receiverAddress: string,
  enabled = false
) =>
  x402Middleware({
    amountCents: 1, // $0.01
    receiverAddress,
    enabled,
    description: "Piggy Bank quote fee",
  });

/**
 * Helper to check if x402 payments are configured
 */
export function isX402Configured(): boolean {
  return !!process.env.X402_RECEIVER_ADDRESS;
}

/**
 * Get x402 receiver address from environment
 */
export function getX402ReceiverAddress(): string {
  const address = process.env.X402_RECEIVER_ADDRESS;
  if (!address) {
    throw new Error("X402_RECEIVER_ADDRESS environment variable not set");
  }
  return address;
}
