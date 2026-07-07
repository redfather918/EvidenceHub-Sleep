import { NextResponse } from "next/server";

// Bing Webmaster Tools verification file
// Serves at /BingSiteAuth.xml for Bing ownership verification

const BING_AUTH_CONTENT = `<?xml version="1.0"?>
<users>
	<user>D16487702D573D1F8B44B26DC3A3BB1C</user>
</users>`;

export async function GET() {
  return new NextResponse(BING_AUTH_CONTENT, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
