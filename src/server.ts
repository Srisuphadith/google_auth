import { Elysia } from "elysia";
import { oauth2 } from "elysia-oauth2";
import { cookie } from "@elysiajs/cookie"
import { cors } from "@elysiajs/cors"
import {jwt} from "@elysiajs/jwt"
new Elysia()
  .use(cookie())
  .use(jwt({
    name:'jwt',
    secret: 'ekjfjrfsenfensfk'
  }))
  .use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      exposeHeaders: ["Set-Cookie"]
    })
  )
  .use(
    oauth2({
      Google: [
        process.env.GOOGLE_OAUTH_CLIENT_ID || "",
        process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
        process.env.GOOGLE_OAUTH_REDIRECT_URI || "",
      ],
    })
  )
  //google login
  .get("/", async ({ oauth2, redirect }) => {
    const url = oauth2.createURL("Google", ["openid", "email", "profile"]);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "select_account consent");

    return redirect(url.href);
  })
  //callback
  .get("/auth/google/callback", async ({ oauth2, cookie, jwt,redirect }) => {
    try {
      const tokens = await oauth2.authorize("Google");
      const accessToken = tokens.accessToken();
      const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })
      const googleUser = await response.json()
      const userId = googleUser.sub || googleUser.id

      const user = {
        id: userId,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        createdAt: new Date()
      }
      const at = await jwt.sign({
        id: user.id,
        email: user.email,
        name: user.name
      })

      cookie.user.set({
        value: user.name,
      })

      return redirect("/profile")
    } catch (error) {
      return redirect("http://localhost:3000")
    }
  })
  //view profile
  .get('/profile', ({ cookie }) => {
    const name = cookie.user.value
    if (!name) {
      return ({ error: "cookie unset" })
    }
    return (name)
  })
  //logout
  .get('/logout', ({ cookie, redirect }) => {
    cookie.user.remove()
    return redirect("http://localhost:3000/")
  })
  .listen(3000);
console.log("auth server running")