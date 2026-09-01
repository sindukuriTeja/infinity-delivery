import asyncio, os
from playwright.async_api import async_playwright

OUT = "/opt/sandbox/workspace/infinity-delivery/screenshots"
os.makedirs(OUT, exist_ok=True)
BASE = "http://localhost:8000"

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        page = await browser.new_page(viewport={"width": 1280, "height": 900})
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append("PAGEERROR: " + str(e)))

        # HOME
        await page.goto(BASE + "/", wait_until="networkidle")
        await page.evaluate("localStorage.clear()")
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(800)
        await page.screenshot(path=f"{OUT}/home.png", full_page=True)
        print("home products rendered:", await page.locator(".p-card").count())

        # add to cart (scroll into view first)
        btns = page.locator(".add-btn")
        await btns.nth(2).scroll_into_view_if_needed()
        await btns.nth(2).click()
        await page.wait_for_timeout(250)
        await btns.nth(5).scroll_into_view_if_needed()
        await btns.nth(5).click()
        await page.wait_for_timeout(300)
        print("cart badge:", await page.locator("#cartBadge").inner_text())

        # open cart drawer
        await page.locator("#cartBtn").click()
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{OUT}/cart.png")

        # checkout
        await page.locator("#goCheckout").click()
        await page.wait_for_timeout(500)
        # apply promo
        await page.fill("#coPromo", "WELCOME50")
        await page.locator("#applyPromo").click()
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{OUT}/checkout.png")

        # place order
        await page.locator("#placeOrder").click()
        await page.wait_for_timeout(1200)
        print("toast after order:", await page.locator("#toast").inner_text())

        # MANDI
        await page.goto(BASE + "/#/mandi", wait_until="networkidle")
        await page.wait_for_timeout(600)
        await page.screenshot(path=f"{OUT}/mandi.png", full_page=True)
        print("mandi cards:", await page.locator(".mandi-card").count())

        # ORDERS
        await page.goto(BASE + "/#/orders", wait_until="networkidle")
        await page.wait_for_timeout(800)
        await page.screenshot(path=f"{OUT}/orders.png", full_page=True)
        print("order cards:", await page.locator(".order-card").count())

        # ADMIN
        await page.goto(BASE + "/#/admin", wait_until="networkidle")
        await page.wait_for_timeout(800)
        await page.screenshot(path=f"{OUT}/admin.png", full_page=True)
        print("stat cards:", await page.locator(".stat-card").count())

        # MOBILE home
        m = await browser.new_page(viewport={"width": 390, "height": 844})
        await m.goto(BASE + "/", wait_until="networkidle")
        await m.wait_for_timeout(800)
        await m.screenshot(path=f"{OUT}/mobile_home.png", full_page=True)

        await browser.close()
        print("\n=== CONSOLE ERRORS ===")
        if errors:
            for e in errors[:20]:
                print("  ", e)
        else:
            print("  (none)")

asyncio.run(main())