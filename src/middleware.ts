import { NextRequest, NextResponse } from "next/server";

// export function middleware(req: NextRequest) {
//   const aff = req.nextUrl.searchParams.get("ref");
//   console.log("Middleware triggered for:", req.nextUrl.pathname);
//   console.log("Query params:", req.nextUrl.searchParams.toString());
  
//   if (!aff) {
//     console.log("No 'ref' parameter found");
//     return NextResponse.next();
//   }

//   const isProd = process.env.NODE_ENV === "production";
//   const res = NextResponse.next();

//   console.log("Setting affiliate cookie:", aff, "isProd:", isProd);
//   console.log("NODE_ENV:", process.env.NODE_ENV);

// res.cookies.set({
//   name: "affiliate_id",
//   value: aff.slice(0, 100),
//   httpOnly: false,
//   sameSite: isProd ? "none" : "lax",  // "none" in prod, "lax" locally
//   secure: isProd,                      // true in prod, false locally
//   path: "/",
//   ...(isProd ? { domain: ".auraasync.in" } : {}),
//   maxAge: 60 * 60 * 24 * 30,
// });

//   console.log("Cookie set successfully");
//   return res;
// }

export function middleware(req: NextRequest) { 
  const aff = req.nextUrl.searchParams.get("ref"); 
   
  if (!aff) { 
    return NextResponse.next(); 
  } 
 
  const isProd = process.env.NODE_ENV === "production"; 
  
  // Clone URL and remove ref parameter for clean redirect
  const url = req.nextUrl.clone();
  url.searchParams.delete('ref');
  
  const res = NextResponse.redirect(url, 302); // 302 temporary redirect
 
  res.cookies.set({ 
    name: "affiliate_id", 
    value: aff.slice(0, 100), 
    httpOnly: false, // Keep false since you need client-side access
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/", 
    ...(isProd ? { domain: ".auraasync.in" } : {}), 
    maxAge: 60 * 60 * 24 * 30, // 30 days - standard attribution window
  });
 
  return res; 
}