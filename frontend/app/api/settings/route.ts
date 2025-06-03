// app/api/settings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Path to settings.json — adjust if needed
const settingsFile = path.join(process.cwd(), "settings.json");

export async function GET() {
  try {
    const file = await fs.readFile(settingsFile, "utf-8");
    return NextResponse.json(JSON.parse(file));
  } catch (error) {
    console.warn("⚠️ Falling back to default settings:", (error as Error).message);
    // Return default settings if file doesn't exist
    return NextResponse.json({
      allowed_text_models: ["llama", "mistral", "phi"],
      default_text_model: "llama",
      allowed_image_models: ["bakllava", "llava-llama3"],
      default_image_model: "bakllava",
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const settingsData = {
      allowed_text_models: body.allowed_text_models || [],
      default_text_model: body.default_text_model || "llama",
      allowed_image_models: body.allowed_image_models || [],
      default_image_model: body.default_image_model || "bakllava",
    };

    await fs.writeFile(settingsFile, JSON.stringify(settingsData, null, 2), "utf-8");
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return NextResponse.json({ status: "error", message: (error as Error).message }, { status: 500 });
  }
}
