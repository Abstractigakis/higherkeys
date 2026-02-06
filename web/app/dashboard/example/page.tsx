"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { callModal, generateImage } from "./actions";

export default function ExamplePage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const msg = await callModal("User");
      setMessage(msg);
    } catch (error) {
      console.error(error);
      setMessage("Error calling Modal");
    } finally {
      setLoading(false);
    }
  };

  const [imagePrompt, setImagePrompt] = useState("A cinematic shot of a computer programming code");
  const [generatedImage, setGeneratedImage] = useState("");
  const [imageLoading, setImageLoading] = useState(false);

  const handleGenerate = async () => {
    setImageLoading(true);
    try {
      const img = await generateImage(imagePrompt);
      setGeneratedImage(img);
    } catch (error) {
      console.error(error);
      setMessage("Error generating image");
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 gap-8">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-4xl font-bold">Next.js + Modal</h1>
        <Button onClick={handleClick} disabled={loading}>
          {loading ? "Loading..." : "Call Modal Hello World"}
        </Button>
        {message && <p className="text-xl">{message}</p>}
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-md">
        <h2 className="text-2xl font-semibold">Instant Image Generation</h2>
        <div className="flex gap-2 w-full">
          <input
            type="text"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
          />
          <Button onClick={handleGenerate} disabled={imageLoading}>
            {imageLoading ? "Generating..." : "Generate"}
          </Button>
        </div>
        {generatedImage && (
          <img src={generatedImage} alt="Generated" className="rounded-lg shadow-lg w-full" />
        )}
      </div>
    </div>
  );
}
