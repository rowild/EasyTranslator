import { createRouter, createWebHistory } from 'vue-router';
import MainView from '../views/MainView.vue';
import SavedTranscriptsView from '../views/SavedTranscriptsView.vue';
import SavedTranscriptDetailView from '../views/SavedTranscriptDetailView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: MainView },
    { path: '/saved', name: 'saved', component: SavedTranscriptsView },
    {
      path: '/saved/:id',
      name: 'saved-detail',
      component: SavedTranscriptDetailView,
      props: route => ({ id: Number(route.params.id) }),
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

export default router;

