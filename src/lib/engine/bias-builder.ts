import { BiasReasoning, TrendResult, PriceActionSignal, SRZone } from "../types";

export function buildBias(
  trend: TrendResult,
  pattern: PriceActionSignal,
  nearestSupport: SRZone | null,
  nearestResistance: SRZone | null,
  indicators: { rsi: number; atr: number; atrPips: number },
  htfAligned: boolean,
  direction: "BUY" | "SELL"
): BiasReasoning {
  const supporting: string[] = [];
  const conflicting: string[] = [];
  const riskFactors: string[] = [];

  const trendAlignmentDesc = `${trend.direction} trend (${trend.strength}% strength). EMA: ${trend.alignment.replace(/_/g, " ")}. HTF: ${trend.higherTFBias}. Structure: ${trend.marketStructure.replace(/_/g, " ")}.`;

  if (trend.alignment.includes("strong")) {
    supporting.push(`EMAs in ${trend.alignment.replace("_", " ")} alignment (20 > 50 > 200), confirming established ${trend.direction.toLowerCase()} trend`);
  } else if (trend.alignment.includes(direction === "BUY" ? "bullish" : "bearish")) {
    supporting.push(`EMAs show ${trend.alignment.replace("_", " ")} alignment supporting ${direction.toLowerCase()} bias`);
  }

  if (trend.marketStructure === "higher_highs_higher_lows" && direction === "BUY") {
    supporting.push("Market structure shows higher highs and higher lows — classic uptrend");
  } else if (trend.marketStructure === "lower_highs_lower_lows" && direction === "SELL") {
    supporting.push("Market structure shows lower highs and lower lows — classic downtrend");
  } else if (trend.marketStructure === "range") {
    riskFactors.push("Market is ranging — breakout or false move possible");
  }

  if (htfAligned && trend.higherTFBias === trend.direction) {
    supporting.push(`Higher timeframe confirms ${trend.direction.toLowerCase()} bias — trading with the big picture trend`);
  }

  let keyLevelDesc = "";
  if (pattern.atKeyLevel && pattern.nearestLevel) {
    const level = pattern.nearestLevel;
    keyLevelDesc = `Price reacting at key ${level.type} zone at ${level.price} (tested ${level.touches}x)`;
    supporting.push(keyLevelDesc);
    if (level.touches >= 3) {
      supporting.push(`Level tested ${level.touches} times — strong ${level.type} zone`);
    }
  } else {
    conflicting.push("Price action not at a strong key level — lower conviction");
  }

  supporting.push(`${pattern.pattern}: ${pattern.description}`);
  const priceActionDesc = `${pattern.pattern} (${pattern.reliability}% reliability)`;

  if (direction === "BUY") {
    if (indicators.rsi < 35) {
      supporting.push(`RSI at ${indicators.rsi} is oversold — room for upward recovery`);
    } else if (indicators.rsi > 70) {
      conflicting.push(`RSI at ${indicators.rsi} is overbought — limited upside`);
      riskFactors.push("Overbought conditions may lead to pullback");
    } else {
      supporting.push(`RSI at ${indicators.rsi} shows healthy momentum with room to run`);
    }
  } else {
    if (indicators.rsi > 65) {
      supporting.push(`RSI at ${indicators.rsi} is overbought — room for downward correction`);
    } else if (indicators.rsi < 30) {
      conflicting.push(`RSI at ${indicators.rsi} is oversold — limited downside`);
      riskFactors.push("Oversold conditions may cause a bounce");
    } else {
      supporting.push(`RSI at ${indicators.rsi} shows healthy bearish momentum`);
    }
  }

  if (indicators.atrPips > 15) {
    riskFactors.push(`Volatility elevated (ATR: ${indicators.atrPips} pips) — wider stops needed`);
  } else if (indicators.atrPips < 5) {
    riskFactors.push(`Volatility low (ATR: ${indicators.atrPips} pips) — squeeze or breakout possible`);
  }

  if (direction === "BUY" && nearestResistance) {
    riskFactors.push(`Nearest resistance at ${nearestResistance.price} may cap upside`);
  }
  if (direction === "SELL" && nearestSupport) {
    riskFactors.push(`Nearest support at ${nearestSupport.price} may limit downside`);
  }

  const primary = buildPrimaryNarrative(trend, pattern, direction, htfAligned);
  const marketContext = `${trend.direction} trend with ${trend.strength}% strength. Structure: ${trend.marketStructure.replace(/_/g, " ")}. ATR: ${indicators.atrPips} pips (${indicators.atrPips > 15 ? "high" : indicators.atrPips > 8 ? "moderate" : "low"} volatility). RSI: ${indicators.rsi}.`;

  return {
    primary,
    supporting,
    conflicting,
    marketContext,
    riskFactors,
    strategy: {
      trendAlignment: trendAlignmentDesc,
      keyLevelAction: keyLevelDesc || "No strong key level interaction",
      priceActionConfirmation: priceActionDesc,
    },
  };
}

function buildPrimaryNarrative(
  trend: TrendResult,
  pattern: PriceActionSignal,
  direction: "BUY" | "SELL",
  htfAligned: boolean
): string {
  let narrative = `${direction} setup: `;

  if (htfAligned) {
    narrative += `Trading with the ${trend.direction.toLowerCase()} trend across multiple timeframes. `;
  } else {
    narrative += `${trend.direction.charAt(0)}${trend.direction.slice(1).toLowerCase()} trend on primary timeframe. `;
  }

  if (pattern.atKeyLevel && pattern.nearestLevel) {
    narrative += `Price reached key ${pattern.nearestLevel.type} at ${pattern.nearestLevel.price} and formed a ${pattern.pattern}, confirming ${direction === "BUY" ? "buyers" : "sellers"} stepping in. `;
  } else {
    narrative += `${pattern.pattern} suggests ${direction === "BUY" ? "buying" : "selling"} pressure increasing. `;
  }

  narrative += `EMA alignment: ${trend.alignment.replace(/_/g, " ")}. Market structure: ${trend.marketStructure.replace(/_/g, " ")}.`;

  return narrative;
}
