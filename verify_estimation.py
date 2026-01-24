from playwright.sync_api import sync_playwright

def verify_estimation_creation():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the verification page
        print("Navigating to /verify-estimation...")
        page.goto("http://localhost:8080/verify-estimation")

        # Expect the "Nueva Estimación" button to be visible
        print("Waiting for 'Nueva Estimación' button...")
        page.get_by_role("button", name="Nueva Estimación").wait_for()

        # Take a screenshot of the initial state (Empty state + Button)
        page.screenshot(path="/home/jules/verification/initial_state.png")
        print("Initial state screenshot taken.")

        # Click the button
        page.get_by_role("button", name="Nueva Estimación").click()

        # Wait for Dialog
        print("Waiting for Dialog...")
        page.get_by_role("dialog").wait_for()

        # Check for Project Selector
        print("Waiting for Project Selector...")
        page.get_by_text("Proyecto *").wait_for()

        # Screenshot of the dialog
        page.screenshot(path="/home/jules/verification/dialog_state.png")

        # Open Project Selector (Combobox)
        # The trigger usually has the placeholder text or "Selecciona un proyecto..."
        # Trying a more generic selector + text
        page.click("button[role='combobox']")

        # Wait for options
        page.get_by_role("option", name="Proyecto Alpha").wait_for()

        # Select an option
        page.get_by_role("option", name="Proyecto Alpha").click()

        # Verify selection
        print("Waiting for button to update...")
        page.locator("button", has_text="Proyecto Alpha").wait_for()

        # Take a screenshot of the filled form
        page.screenshot(path="/home/jules/verification/verification.png")
        print("Final screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_estimation_creation()
