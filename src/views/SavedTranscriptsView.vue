<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, Trash2, ChevronRight } from 'lucide-vue-next';
import Background from '../components/Background.vue';
import { useTranscriptionsStore } from '../stores/transcriptions';
import { languages } from '../config/languages';

const router = useRouter();
const transcriptionsStore = useTranscriptionsStore();

onMounted(() => {
  void transcriptionsStore.loadAll();
});

const items = computed(() => transcriptionsStore.items);

const formatDate = (ts: number) =>
  new Date(ts).toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });

const getFlag = (code: string) => languages.find(l => l.displayCode === code)?.flag || '🌐';

const snippet = (text: string) => (text.length > 140 ? `${text.slice(0, 137)}…` : text);

const openItem = (id?: number) => {
  if (!id) return;
  void router.push(`/saved/${id}`);
};

const deleteItem = async (id?: number) => {
  if (!id) return;
  if (!confirm('Delete this saved transcript?')) return;
  await transcriptionsStore.remove(id);
};
</script>

<template>
  <div class="main-view">
    <header>
      <h1><span>Saved</span><span>&</span><span>Transcripts</span></h1>
    </header>

    <div class="center-content">
      <main>
        <div v-if="items.length === 0" class="empty-state">
          <div class="empty-title">No saved transcripts yet.</div>
          <div class="empty-subtitle">Save a transcript after translating, then it will appear here.</div>
        </div>

        <div v-else class="saved-list" role="list" aria-label="Saved transcripts">
          <div
            v-for="item in items"
            :key="item.id"
            class="saved-item"
            role="listitem"
            @click="openItem(item.id)"
          >
            <div class="item-main">
              <div class="item-meta">
                <span class="flag">{{ getFlag(item.sourceLang) }}</span>
                <span class="time">{{ formatDate(item.createdAt) }}</span>
                <span class="targets">{{ item.targetCodes.length }} targets</span>
              </div>
              <div class="item-snippet">{{ snippet(item.sourceText) }}</div>
            </div>

            <div class="item-actions">
              <button
                class="icon-btn"
                type="button"
                title="Delete"
                @click.stop="deleteItem(item.id)"
              >
                <Trash2 :size="18" />
              </button>
              <ChevronRight :size="18" class="chevron" />
            </div>
          </div>
        </div>
      </main>
    </div>

    <footer class="app-footer">
      <div class="footer-left">
        <button class="footer-info-btn" @click="router.push('/')" title="Back to main">
          <ArrowLeft :size="20" />
          <span class="info-label">Back</span>
        </button>
      </div>
      <div class="footer-right"></div>
    </footer>

    <Background />
  </div>
</template>

<style scoped>
main {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.saved-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-right: 0.25rem;
}

.saved-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 0.9rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  cursor: pointer;
  transition: transform 0.12s ease, background 0.12s ease, border-color 0.12s ease;
}

.saved-item:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.2);
}

.item-main {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.85rem;
}

.flag {
  font-size: 1.1rem;
  line-height: 1;
}

.time {
  opacity: 0.85;
  font-weight: 700;
}

.targets {
  opacity: 0.8;
  font-weight: 700;
}

.item-snippet {
  color: rgba(255, 255, 255, 0.95);
  font-size: 0.95rem;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(0, 0, 0, 0.12);
  color: rgba(255, 255, 255, 0.92);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.12s ease;
}

.icon-btn:hover {
  transform: scale(1.04);
  background: rgba(0, 0, 0, 0.18);
}

.chevron {
  opacity: 0.8;
}

.empty-state {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.4rem;
  padding: 1.25rem;
}

.empty-title {
  font-weight: 900;
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.95);
}

.empty-subtitle {
  font-weight: 700;
  opacity: 0.8;
  color: rgba(255, 255, 255, 0.92);
  max-width: 36ch;
}
</style>
