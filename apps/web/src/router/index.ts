import { createMemoryHistory, createRouter, createWebHistory, type RouteRecordRaw, type RouterHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useProfileStore } from '../stores/profile';

const view = (title: string) => ({ component: () => import('../views/PlaceholderView.vue'), props: { title } });
const routes: RouteRecordRaw[] = [
  { path: '/', component: () => import('../layouts/PublicLayout.vue'), meta: { public: true }, children: [{ path: '', ...view('Golf Track') }, { path: 'sign-in', component: () => import('../views/SignInView.vue') }, { path: 'register', component: () => import('../views/RegisterView.vue') }, { path: 'auth/callback', component: () => import('../views/AuthCallbackView.vue') }] },
  { path: '/profile/complete', component: () => import('../views/ProfileCompletionView.vue'), meta: { requiresAuth: true, profileIndependent: true } },
  { path: '/app', component: () => import('../layouts/AppLayout.vue'), meta: { requiresAuth: true, requiresProfile: true }, children: [{ path: '', ...view('Home') }, { path: 'rounds', ...view('Rounds') }, { path: 'round/start', ...view('Start Round') }, { path: 'courses', ...view('Courses') }, { path: 'profile', ...view('Profile') }] },
  { path: '/:pathMatch(.*)*', ...view('Not Found') },
];
function defaultHistory(): RouterHistory { return typeof window === 'undefined' ? createMemoryHistory() : createWebHistory(); }
export function createAppRouter(history: RouterHistory = defaultHistory()) {
const router = createRouter({ history, routes });
router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.initialize();
  if (to.meta.requiresAuth && !auth.isAuthenticated) return { path: '/sign-in', query: { redirect: to.fullPath } };
  if (auth.isAuthenticated && to.meta.requiresAuth) {
    const profiles = useProfileStore(); await profiles.restore();
    if (to.meta.requiresProfile && !profiles.hasProfile) return { path: '/profile/complete', query: { redirect: to.fullPath } };
    if (to.path === '/profile/complete' && profiles.hasProfile) return '/app';
  }
  if ((to.path === '/sign-in' || to.path === '/register') && auth.isAuthenticated) return '/app';
  return true;
});
return router;
}
const router = createAppRouter();
export default router;