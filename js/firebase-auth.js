/**
 * CompilerG — Firebase Authentication Module
 * Handles Google OAuth, GitHub OAuth, and Email/Password sign-in/sign-up.
 * Updates the navbar UI to reflect auth state.
 */

// ── Firebase Configuration ──────────────────────────────────────────────────
// Using Firebase v9 compat mode (loaded via CDN in index.html)
const firebaseConfig = {
    apiKey: "AIzaSyANLvVfxkjb4CSkFZXC3YyDeheq2xsf7Qk",
    authDomain: "compilerg-auth.firebaseapp.com",
    projectId: "compilerg-auth",
    storageBucket: "compilerg-auth.firebasestorage.app",
    messagingSenderId: "547328604804",
    appId: "1:547328604804:web:c8ed2a4c9794adab9420d1"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ── Auth Providers ──────────────────────────────────────────────────────────
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

const githubProvider = new firebase.auth.GithubAuthProvider();
githubProvider.addScope('user:email');

// ── Generates crisp inline SVG avatar with initials ─────────────────────────
function getInitialsAvatar(name) {
    const clean = (name || 'User').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    const initials = parts.length >= 2 
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : (clean.slice(0, 2).toUpperCase() || 'U');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <defs>
            <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffd43f"/>
                <stop offset="100%" stop-color="#ff9800"/>
            </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="32" fill="url(#avatarGrad)"/>
        <text x="50%" y="53%" dominant-baseline="central" text-anchor="middle" fill="#120f22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="24">${initials}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function applyAvatarToImage(imgEl, user, displayName) {
    if (!imgEl) return;
    const fallbackSvg = getInitialsAvatar(displayName);
    imgEl.referrerPolicy = 'no-referrer';
    imgEl.setAttribute('referrerpolicy', 'no-referrer');
    imgEl.crossOrigin = 'anonymous';
    imgEl.onerror = function() {
        this.onerror = null;
        this.src = fallbackSvg;
    };
    if (user && user.photoURL) {
        // Request higher resolution for crisp display
        const photo = user.photoURL.replace(/=s\d+(-c)?$/, '=s128-c');
        imgEl.src = photo;
    } else {
        imgEl.src = fallbackSvg;
    }
    imgEl.style.display = 'block';
}

// ── UI Elements ─────────────────────────────────────────────────────────────
function getAuthElements() {
    return {
        navSignInBtn: document.getElementById('navSignInBtn'),
        navSignUpBtn: document.getElementById('navSignUpBtn'),
        navUserArea: document.getElementById('navUserArea'),
        navUserAvatar: document.getElementById('navUserAvatar'),
        navUserName: document.getElementById('navUserName'),
        navLogoutBtn: document.getElementById('navLogoutBtn'),
        editorUserArea: document.getElementById('editorUserArea'),
        editorUserAvatar: document.getElementById('editorUserAvatar'),
        editorUserName: document.getElementById('editorUserName'),
        authModal: document.getElementById('authModal'),
        authForm: document.getElementById('authForm'),
        authEmail: document.getElementById('authEmail'),
        authPassword: document.getElementById('authPassword'),
        authDemoGoogle: document.getElementById('authDemoGoogle'),
        authDemoGithub: document.getElementById('authDemoGithub'),
        authSubmitLabel: document.getElementById('authSubmitLabel'),
        authModalTitle: document.getElementById('authModalTitle'),
        authTabSignIn: document.getElementById('authTabSignIn'),
        authTabSignUp: document.getElementById('authTabSignUp'),
        authError: document.getElementById('authError'),
    };
}

// ── Current Auth Mode ───────────────────────────────────────────────────────
let currentAuthMode = 'signin'; // 'signin' or 'signup'

// ── Show/Hide Loading on Button ─────────────────────────────────────────────
function setAuthLoading(isLoading) {
    const els = getAuthElements();
    const submitBtn = document.getElementById('authSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = isLoading;
        if (els.authSubmitLabel) {
            els.authSubmitLabel.textContent = isLoading
                ? 'Please wait...'
                : (currentAuthMode === 'signup' ? 'Create Account' : 'Sign In');
        }
    }
    if (els.authDemoGoogle) els.authDemoGoogle.disabled = isLoading;
    if (els.authDemoGithub) els.authDemoGithub.disabled = isLoading;
}

// ── Show Auth Error ─────────────────────────────────────────────────────────
function showAuthError(message) {
    const els = getAuthElements();
    if (els.authError) {
        els.authError.textContent = message;
        els.authError.style.display = 'block';
        setTimeout(() => {
            if (els.authError) els.authError.style.display = 'none';
        }, 6000);
    }
}

function clearAuthError() {
    const els = getAuthElements();
    if (els.authError) {
        els.authError.textContent = '';
        els.authError.style.display = 'none';
    }
}

// ── Friendly Error Messages ─────────────────────────────────────────────────
function getFriendlyError(code, message) {
    const map = {
        'auth/operation-not-allowed': 'GitHub sign-in is not enabled yet in Firebase Console. Please sign in with Google or Email/Password.',
        'auth/operation-not-supported-in-this-environment': 'Sign-in does not work from a local file (file://). Please open http://localhost:3000 in your browser.',
        'auth/unauthorized-domain': `Domain (${window.location.hostname || 'current domain'}) is not authorized in Firebase Console.`,
        'auth/popup-blocked': 'Sign-in popup was blocked by browser. Please allow popups for this site or try again.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed before completing.',
        'auth/network-request-failed': 'Network connection error. Please check your internet.',
        'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Password must be at least 6 characters long.',
        'auth/user-not-found': 'No account found with this email. Try creating one.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-credential': 'Invalid email or password. Please check and try again.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
        'auth/cancelled-popup-request': 'Only one popup can be open at a time.',
        'auth/internal-error': 'Browser blocked authentication cookies. If using Brave or Incognito, please allow cookies/popups.',
    };
    if (map[code]) return map[code];
    return message || (code ? `Error (${code}): Please try again.` : 'Something went wrong. Please try again.');
}

// ── Update Navbar UI ────────────────────────────────────────────────────────
function updateNavbarUI(user) {
    const els = getAuthElements();

    if (user) {
        // User is signed in — hide sign-in/up buttons, show user area
        if (els.navSignInBtn) els.navSignInBtn.style.display = 'none';
        if (els.navSignUpBtn) els.navSignUpBtn.style.display = 'none';
        
        const displayName = user.displayName || user.email?.split('@')[0] || 'User';

        // 1. Home Navbar User Area
        if (els.navUserArea) {
            els.navUserArea.style.display = 'flex';
            if (els.navUserAvatar) {
                applyAvatarToImage(els.navUserAvatar, user, displayName);
            }
            if (els.navUserName) {
                els.navUserName.textContent = displayName;
            }
        }

        // 2. Editor Navbar User Area
        if (els.editorUserArea) {
            els.editorUserArea.style.display = 'flex';
            if (els.editorUserAvatar) {
                applyAvatarToImage(els.editorUserAvatar, user, displayName);
            }
            if (els.editorUserName) {
                els.editorUserName.textContent = displayName;
            }
        }
    } else {
        // No user — show sign-in/up buttons, hide user areas
        if (els.navSignInBtn) els.navSignInBtn.style.display = '';
        if (els.navSignUpBtn) els.navSignUpBtn.style.display = '';
        if (els.navUserArea) els.navUserArea.style.display = 'none';
        if (els.editorUserArea) els.editorUserArea.style.display = 'none';
    }
}

// ── Auth State Listener ─────────────────────────────────────────────────────
auth.onAuthStateChanged((user) => {
    window.currentUser = user || null;
    updateNavbarUI(user);
    if (user) {
        console.log('[CompilerG Auth] Signed in as:', user.displayName || user.email);
        window.dispatchEvent(new CustomEvent('compilerg:user-change', { detail: { user } }));
    } else {
        console.log('[CompilerG Auth] Signed out');
        window.dispatchEvent(new CustomEvent('compilerg:user-change', { detail: { user: null } }));
    }
});

// ── Sign In with Email/Password ─────────────────────────────────────────────
// ── Sign In with Email/Password ─────────────────────────────────────────────
async function signInWithEmail(email, password) {
    clearAuthError();
    if (window.location.protocol === 'file:') {
        showAuthError('Authentication requires a web server. Please open http://localhost:3000 in your browser.');
        return;
    }
    setAuthLoading(true);
    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        const els = getAuthElements();
        if (els.authModal) els.authModal.classList.remove('open');
        if (typeof showToast === 'function') {
            showToast(`Welcome back, ${result.user.displayName || result.user.email}!`, 'success');
        }
    } catch (error) {
        console.error('[CompilerG Auth] Sign in error:', error);
        showAuthError(getFriendlyError(error.code, error.message));
    } finally {
        setAuthLoading(false);
    }
}

// ── Sign Up with Email/Password ─────────────────────────────────────────────
async function signUpWithEmail(email, password) {
    clearAuthError();
    if (window.location.protocol === 'file:') {
        showAuthError('Authentication requires a web server. Please open http://localhost:3000 in your browser.');
        return;
    }
    setAuthLoading(true);
    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        // Set display name from email
        await result.user.updateProfile({
            displayName: email.split('@')[0]
        });
        const els = getAuthElements();
        if (els.authModal) els.authModal.classList.remove('open');
        if (typeof showToast === 'function') {
            showToast(`Account created! Welcome, ${result.user.displayName || email}!`, 'success');
        }
    } catch (error) {
        console.error('[CompilerG Auth] Sign up error:', error);
        showAuthError(getFriendlyError(error.code, error.message));
    } finally {
        setAuthLoading(false);
    }
}

// ── Sign In with Google ─────────────────────────────────────────────────────
async function signInWithGoogle() {
    clearAuthError();
    if (window.location.protocol === 'file:') {
        showAuthError('Google sign-in does not work directly from a local file (file://). Please open http://localhost:3000 in your browser!');
        return;
    }
    setAuthLoading(true);
    try {
        const result = await auth.signInWithPopup(googleProvider);
        const els = getAuthElements();
        if (els.authModal) els.authModal.classList.remove('open');
        if (typeof showToast === 'function') {
            showToast(`Signed in with Google as ${result.user.displayName || result.user.email}!`, 'success');
        }
    } catch (error) {
        console.error('[CompilerG Auth] Google sign-in error:', error);
        if (error.code === 'auth/popup-blocked') {
            // Popup blocked: attempt redirect fallback
            try {
                console.log('[CompilerG Auth] Popup blocked, trying redirect sign-in...');
                await auth.signInWithRedirect(googleProvider);
                return;
            } catch (redirErr) {
                showAuthError(getFriendlyError(redirErr.code, redirErr.message));
            }
        } else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
            showAuthError(getFriendlyError(error.code, error.message));
        }
    } finally {
        setAuthLoading(false);
    }
}

// ── Sign In with GitHub ─────────────────────────────────────────────────────
async function signInWithGithub() {
    clearAuthError();
    if (window.location.protocol === 'file:') {
        showAuthError('GitHub sign-in does not work directly from a local file (file://). Please open http://localhost:3000 in your browser!');
        return;
    }
    setAuthLoading(true);
    try {
        const result = await auth.signInWithPopup(githubProvider);
        const els = getAuthElements();
        if (els.authModal) els.authModal.classList.remove('open');
        if (typeof showToast === 'function') {
            showToast(`Signed in with GitHub as ${result.user.displayName || result.user.email}!`, 'success');
        }
    } catch (error) {
        console.error('[CompilerG Auth] GitHub sign-in error:', error);
        if (error.code === 'auth/operation-not-allowed') {
            showAuthError('GitHub sign-in is not configured yet in Firebase. Please sign in with Google or Email/Password!');
        } else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
            showAuthError(getFriendlyError(error.code, error.message));
        }
    } finally {
        setAuthLoading(false);
    }
}

// ── Sign Out ────────────────────────────────────────────────────────────────
async function signOutUser() {
    try {
        await auth.signOut();
        if (typeof showToast === 'function') {
            showToast('Signed out successfully!', 'info');
        }
    } catch (error) {
        console.error('[CompilerG Auth] Sign out error:', error);
    }
}

// ── Initialize Auth Event Listeners ─────────────────────────────────────────
function initFirebaseAuth() {
    const els = getAuthElements();

    // Google sign-in button
    if (els.authDemoGoogle) {
        // Remove old event listeners by cloning
        const newGoogleBtn = els.authDemoGoogle.cloneNode(true);
        els.authDemoGoogle.parentNode.replaceChild(newGoogleBtn, els.authDemoGoogle);
        newGoogleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signInWithGoogle();
        });
    }

    // GitHub sign-in button
    if (els.authDemoGithub) {
        const newGithubBtn = els.authDemoGithub.cloneNode(true);
        els.authDemoGithub.parentNode.replaceChild(newGithubBtn, els.authDemoGithub);
        newGithubBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signInWithGithub();
        });
    }

    // Email/password form
    if (els.authForm) {
        const newForm = els.authForm.cloneNode(true);
        els.authForm.parentNode.replaceChild(newForm, els.authForm);
        newForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('authEmail')?.value?.trim();
            const password = document.getElementById('authPassword')?.value;

            if (!email || !password) {
                showAuthError('Please enter both email and password.');
                return;
            }

            if (currentAuthMode === 'signup') {
                signUpWithEmail(email, password);
            } else {
                signInWithEmail(email, password);
            }
        });
    }

    // Logout button
    if (els.navLogoutBtn) {
        els.navLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signOutUser();
        });
    }

    // Auth tabs (sign-in / sign-up)
    if (els.authTabSignIn) {
        const newTabIn = els.authTabSignIn.cloneNode(true);
        els.authTabSignIn.parentNode.replaceChild(newTabIn, els.authTabSignIn);
        newTabIn.addEventListener('click', () => {
            currentAuthMode = 'signin';
            newTabIn.classList.add('active');
            const tabUp = document.getElementById('authTabSignUp');
            if (tabUp) tabUp.classList.remove('active');
            const title = document.getElementById('authModalTitle');
            const label = document.getElementById('authSubmitLabel');
            if (title) title.textContent = 'Welcome back to CompilerG';
            if (label) label.textContent = 'Sign In';
            clearAuthError();
        });
    }

    if (els.authTabSignUp) {
        const newTabUp = els.authTabSignUp.cloneNode(true);
        els.authTabSignUp.parentNode.replaceChild(newTabUp, els.authTabSignUp);
        newTabUp.addEventListener('click', () => {
            currentAuthMode = 'signup';
            newTabUp.classList.add('active');
            const tabIn = document.getElementById('authTabSignIn');
            if (tabIn) tabIn.classList.remove('active');
            const title = document.getElementById('authModalTitle');
            const label = document.getElementById('authSubmitLabel');
            if (title) title.textContent = 'Create your CompilerG account';
            if (label) label.textContent = 'Create Account';
            clearAuthError();
        });
    }

    // Check if returning from a redirect sign-in
    auth.getRedirectResult().then((result) => {
        if (result && result.user) {
            const els = getAuthElements();
            if (els.authModal) els.authModal.classList.remove('open');
            if (typeof showToast === 'function') {
                showToast(`Signed in as ${result.user.displayName || result.user.email}!`, 'success');
            }
        }
    }).catch((err) => {
        console.error('[CompilerG Auth] Redirect result error:', err);
        showAuthError(getFriendlyError(err.code, err.message));
    });

    console.log('[CompilerG Auth] Firebase Authentication initialized');
}

// ── Auto-init when DOM is ready ─────────────────────────────────────────────
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirebaseAuth);
} else {
    // DOM already loaded, init after a small delay to let app.js finish
    setTimeout(initFirebaseAuth, 100);
}
