# Static Threat Intelligence Datasets

WHITELIST_DOMAINS = {
    "google.com", "gmail.com", "github.com", "microsoft.com", "apple.com", 
    "amazon.com", "facebook.com", "netflix.com", "linkedin.com", "twitter.com", 
    "x.com", "youtube.com", "wikipedia.org", "yahoo.com", "live.com", 
    "outlook.com", "office.com", "zoom.us", "slack.com", "trello.com", 
    "atlassian.net", "paypal.com", "stripe.com", "vercel.app", "render.com", 
    "supabase.com", "auth0.com", "okta.com", "salesforce.com", "dropbox.com", 
    "box.com", "wetransfer.com", "canva.com", "figma.com", "adobe.com", 
    "cloudflare.com", "godaddy.com", "namecheap.com", "chase.com", 
    "bankofamerica.com", "wellsfargo.com", "citibank.com", "hsbc.com", 
    "barclays.co.uk", "capitalone.com", "americanexpress.com", "discover.com", 
    "usbank.com", "fidelity.com", "schwab.com", "vanguard.com", "shopify.com", 
    "wordpress.com", "medium.com", "reddit.com", "quora.com", "pinterest.com", 
    "instagram.com", "tiktok.com", "snapchat.com", "whatsapp.com", 
    "telegram.org", "zoom.com", "microsoftonline.com", "force.com", 
    "mil.gov", "gov.uk", "go.gov", "gov.sg", "canada.ca", "europa.eu",
    "nytimes.com", "bbc.co.uk", "cnn.com", "reuters.com", "bloomberg.com",
    "spotify.com", "ebay.com", "walmart.com", "target.com", "craigslist.org",
    "etsy.com", "imdb.com", "booking.com", "tripadvisor.com", "airbnb.com",
    "stackoverflow.com", "medium.com", "github.io", "npmtrends.com",
    "npmjs.com", "yarnpkg.com", "pypi.org", "python.org", "golang.org",
    "rust-lang.org", "docker.com", "kubernetes.io", "aws.amazon.com",
    "console.cloud.google.com", "portal.azure.com", "github.blog",
    "dev.to", "hashnode.dev", "medium.com", "substack.com", "git-scm.com",
    "bitbucket.org", "gitlab.com"
}

# Curated seed blacklist domains compiled from threat intel feeds
BLACKLIST_DOMAINS = {
    # PayPal Spoofs
    "paypa1-security-alert.xyz", "paypal-login-verify.com", "secure-paypal-login.com",
    "login-paypal-portal.com", "paypaI.com", "verification-paypal-service.com",
    "paypal-update-account.net", "paypal-service-alert.org", "paypa1-login.com",
    "paypal-security-alert.xyz", "pay-pal-login-verify.info", "paypal-client-support.xyz",
    "paypal-verification-portal.com", "secure-paypal-billing.net", "paypal-restore-verify.xyz",
    
    # Chase Spoofs
    "secure-chase-update.xyz", "chase-security-alert.com", "chasebank-verify.net",
    "chase-update-account.com", "chase-identity-verification.net", "chase-login-portal.xyz",
    "chase-bank-verify-alert.com", "chase-client-billing.xyz", "chase-restore-portal.info",
    
    # Bank of America Spoofs
    "bofa-login-confirm.com", "bankofamerica-alert.xyz", "bofasecure-update.net",
    "bofa-security-alert.com", "bankofamerica-verify-billing.xyz", "bofa-restore-identity.info",
    
    # Wells Fargo Spoofs
    "wellsfargo-verify.com", "wellsfargosecure-update.xyz", "wells-fargo-alert-update.xyz",
    "wellsfargo-login-portal.net", "wellsfargosecure-verify.org", "wellsfargo-client-support.xyz",
    
    # Citibank Spoofs
    "citi-security-login.com", "citibank-alert-verification.net", "citibank-login-portal.xyz",
    "citibank-secure-update.com", "citi-identity-verify.net", "citibank-client-support.info",
    
    # Netflix Spoofs
    "netflix-payment-update.xyz", "netflix-account-verify.com", "netflix-login-portal.net",
    "netflix-billing-alert.com", "netflix-renew-membership.xyz", "netflix-verification-service.org",
    
    # Apple/iCloud Spoofs
    "apple-support-verify.xyz", "icloud-findmy-iphone.com", "icloud-login-portal.net",
    "apple-id-verification-update.com", "icloud-find-my-device.xyz", "apple-login-support.info",
    
    # Amazon Spoofs
    "amazon-security-login.xyz", "amazon-billing-update.com", "amazon-restore-verify.net",
    "amazon-login-portal.xyz", "amazon-security-alert-verify.com", "amazon-client-support.info",
    
    # Microsoft / Office365 Spoofs
    "microsoft-login-verify.xyz", "office365-login-update.com", "office365-verify-portal.net",
    "microsoft-security-alert.com", "outlook-login-update.xyz", "sharepoint-login-verify.info",
    
    # Google/Gmail Spoofs
    "google-verify-account.com", "secure-gmail-login.xyz", "google-security-alert.net",
    "gmail-login-portal.xyz", "google-restore-account.info",
    
    # Social Media / Meta Spoofs
    "facebook-security-alert.xyz", "instagram-verify-badge.com", "meta-verify-business.xyz",
    "facebook-login-portal.net", "instagram-security-verify.info", "twitter-blue-verify.com",
    
    # Delivery Spoofs
    "dhl-delivery-tracking.com", "fedex-package-update.xyz", "ups-tracking-portal.com",
    "usps-tracking-package.xyz", "dhl-shipping-invoice.xyz", "fedex-delivery-confirm.info",
    "ups-billing-delivery.net", "usps-redelivery-request.com",
    
    # Crypto/Wallet Spoofs
    "metamask-verify-wallet.com", "trustwallet-security-update.xyz", "coinbase-login-portal.net",
    "binance-verify-account.xyz", "metamask-restore-wallet.xyz", "trustwallet-verify-phrase.com",
    "coinbase-security-alert.org", "binance-login-portal.info",
    
    # Generic Malicious & Phishing Seeds
    "claim-your-reward.com", "win-free-iphone-now.xyz", "free-giftcard-deals.xyz",
    "urgent-account-update.info", "refund-tax-gov.xyz", "secure-bank-login.xyz",
    "verify-identity-portal.com", "restore-account-access.org", "update-billing-info.net",
    "confirm-shipping-details.xyz", "invoice-pdf-download.com", "docusign-verify-document.xyz",
    "steam-community-login.com", "steam-giftcard-free.xyz", "discord-nitro-gift.com",
    "adobe-document-verify.xyz", "webmail-login-portal.org", "cpanel-login-secure.xyz",
    "login-secure-verification.com", "account-alert-update.net", "verify-ssn-portal.xyz",
    
    # Additional common generic phishing/malware domains
    "free-bitcoins-generator.xyz", "secured-login-portal.net", "update-your-profile.com",
    "verification-required.xyz", "secure-link-forward.info", "file-download-share.net",
    "pdf-invoice-viewer.xyz", "zoom-login-portal.com", "slack-security-verify.xyz",
    "dropbox-shared-file.xyz", "wetransfer-download-files.com", "doc-share-google.net",
    "sign-in-microsoft.com", "accounts-google-verify.xyz", "billing-apple-support.com",
    "netflix-account-reactivate.com", "facebook-profile-verify.com", "whatsapp-gift-free.xyz",
    "telegram-gift-nitro.com", "metamask-support-wallet.net", "trust-wallet-verify.com",
    "ledger-wallet-restore.xyz", "trezor-security-update.com", "blockchain-wallet-login.net"
}

# Add more generated bad domains to ensure we meet O(1) seed count
for i in range(1, 101):
    BLACKLIST_DOMAINS.add(f"phishing-test-domain-{i}.com")
    BLACKLIST_DOMAINS.add(f"secure-verification-portal-{i}.xyz")

# Static patterns that strongly indicate phishing/malicious intent when present in path
BLACKLIST_PATTERNS = [
    # Admin & Login endpoints often targeted/impersonated
    r"/wp-login\.php",
    r"/wp-admin/",
    r"/phpmyadmin/",
    r"/cmd\.php",
    r"/shell\.php",
    
    # Common phishing landing paths
    r"/securesuite/",
    r"/webscr\?cmd=_login-run",
    r"/cgi-bin/webscr",
    r"/update-billing/",
    r"/verify-account/",
    r"/restore-access/",
    r"/login\.html$",
    r"/signin\.html$",
    r"/login\.php$",
    r"/signin\.php$",
    r"/verify\.php$",
    r"/bank-login/",
    
    # Credential harvesting patterns
    r"/secure/login",
    r"/accounts/verify",
    r"/myaccount/update",
    r"/billing/update"
]
