<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';

// Состояние приложения
const images = ref([]);
const currentImageIndex = ref(0);
const hoveredItem = ref(null);
const markerMode = ref(false);
const markers = ref([]);
const currentCoords = ref(null);
const imageElement = ref(null);
const tooltipPosition = ref({ left: '0px', top: '0px' });

// Загрузка изображений
const loadImages = async () => {
  try {
    const response = await axios.get('http://localhost:5000/api/images');
    images.value = response.data.map(img => ({
      ...img,
      items: img.items || []
    }));
  } catch (err) {
    console.error('Error loading images:', err);
  }
};

// Навигация
const navigate = (direction) => {
  if (images.value.length === 0) return;
  
  currentImageIndex.value = direction === 'next'
    ? (currentImageIndex.value + 1) % images.value.length
    : (currentImageIndex.value - 1 + images.value.length) % images.value.length;
  
  resetMarkers();
};

const resetMarkers = () => {
  markers.value = [];
  hoveredItem.value = null;
};

// Координаты
const getRelativeCoords = (e) => {
  const rect = imageElement.value.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * 100,
    y: ((e.clientY - rect.top) / rect.height) * 100
  };
};

const handleMouseMove = (e) => {
  if (!imageElement.value) return;
  
  currentCoords.value = getRelativeCoords(e);
  
  if (!markerMode.value) {
    hoveredItem.value = findHoveredItem(currentCoords.value.x, currentCoords.value.y) || null;
    
    // Обновляем позицию подсказки
    if (hoveredItem.value) {
      updateTooltipPosition(e);
    }
  }
};

const findHoveredItem = (x, y) => {
  return images.value[currentImageIndex.value]?.items.find(item => 
    x >= item.x && x <= item.x + item.width &&
    y >= item.y && y <= item.y + item.height
  );
};

// Позиция подсказки
const updateTooltipPosition = (e) => {
  if (!imageElement.value) return;
  
  const rect = imageElement.value.getBoundingClientRect();
  const offset = 15; // Отступ от курсора
  
  tooltipPosition.value = {
    left: `${e.clientX - rect.left + offset}px`,
    top: `${e.clientY - rect.top + offset}px`
  };
};

// Разметка
const toggleMarkerMode = () => {
  markerMode.value = !markerMode.value;
  resetMarkers();
};

const placeMarker = (e) => {
  if (!markerMode.value) return;
  
  const coords = getRelativeCoords(e);
  markers.value.push(coords);
  
  if (markers.value.length > 2) {
    markers.value.shift();
  }
};

// Генерация области
const currentArea = computed(() => {
  if (markers.value.length < 2) return null;
  
  const [first, second] = markers.value;
  return {
    x: Math.min(first.x, second.x),
    y: Math.min(first.y, second.y),
    width: Math.abs(first.x - second.x),
    height: Math.abs(first.y - second.y)
  };
});

const generateSQL = () => {
  if (!currentArea.value) return;
  
  const { x, y, width, height } = currentArea.value;
  const newItem = {
    x, y, width, height,
    name: 'Новый экспонат',
    description: 'Описание экспоната'
  };
  
  // Добавляем новый предмет в текущее изображение
  images.value[currentImageIndex.value].items.push(newItem);
  console.log('Новый предмет добавлен:', newItem);
  
  const sql = `INSERT INTO museum_items 
    (image_id, name, description, x, y, width, height) 
    VALUES 
    (${currentImageIndex.value + 1}, '${newItem.name}', '${newItem.description}', 
    ${x.toFixed(2)}, ${y.toFixed(2)}, ${width.toFixed(2)}, ${height.toFixed(2)});`;
  
  console.log('SQL для вставки:', sql);
  markers.value = [];
};

// Инициализация
onMounted(() => {
  loadImages();
});
</script>

<template>
  <div class="museum-app">
    <header class="app-header">
      <div class="header-content">
        <h1 class="app-title">
          MuseumGallery
        </h1>
        <button 
          @click="toggleMarkerMode" 
          :class="{ 'active': markerMode }"
          class="mode-toggle"
        >
          <span v-if="markerMode">🖍️ Режим просмотра</span>
          <span v-else>✏️ Режим разметки</span>
        </button>
      </div>
      
      <div v-if="markerMode" class="marker-guide">
        Кликните по двум углам объекта для разметки
      </div>
    </header>

    <main class="gallery-main">
      <div class="gallery-frame">
        <transition name="fade" mode="out-in">
          <div v-if="images.length" class="image-viewer" :key="currentImageIndex">
            <div class="image-wrapper">
              <img
                ref="imageElement"
                :src="images[currentImageIndex].data"
                alt="Музейный экспонат"
                @mousemove="handleMouseMove"
                @mouseleave="hoveredItem = null"
                @click="placeMarker"
                :class="{ 'marker-mode': markerMode }"
              />

              <!-- Области предметов -->
              <div
                v-for="(item, index) in images[currentImageIndex].items"
                :key="index"
                class="item-area"
                :style="{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  width: `${item.width}%`,
                  height: `${item.height}%`
                }"
                @mouseover="hoveredItem = item"
                @mouseout="hoveredItem = null"
              />

              <!-- Маркеры разметки -->
              <div
                v-for="(marker, index) in markers"
                :key="`marker-${index}`"
                class="placement-marker"
                :style="{
                  left: `${marker.x}%`,
                  top: `${marker.y}%`
                }"
              />

              <!-- Временная область -->
              <div
                v-if="currentArea"
                class="temp-area"
                :style="{
                  left: `${currentArea.x}%`,
                  top: `${currentArea.y}%`,
                  width: `${currentArea.width}%`,
                  height: `${currentArea.height}%`
                }"
              />
            </div>

            <!-- Подсказка -->
            <div
              v-if="hoveredItem"
              class="item-tooltip"
              :style="tooltipPosition"
            >
              <div class="tooltip-content">
                <h3>{{ hoveredItem.name }}</h3>
                <p>{{ hoveredItem.description }}</p>
              </div>
              <div class="tooltip-arrow"></div>
            </div>
          </div>

          <div v-else class="loading-state">
            <div class="spinner"></div>
            <p>Загрузка коллекции...</p>
          </div>
        </transition>
      </div>
    </main>

    <footer class="gallery-footer">
      <button @click="navigate('prev')" class="nav-button prev">
        <span class="icon">←</span> Предыдущий
      </button>
      
      <button
        v-if="markerMode && currentArea"
        @click="generateSQL"
        class="save-button"
      >
        <span class="icon">💾</span> Сохранить область
      </button>
      
      <button @click="navigate('next')" class="nav-button next">
        Следующий <span class="icon">→</span>
      </button>
    </footer>
  </div>
</template>

<style scoped>


/* Базовые стили */
.museum-app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f5f7fa;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: var(--dark);
}

/* Шапка приложения */
.app-header {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  background-color: #64A5EF;
  padding: 1rem 2rem;
  box-shadow: var(--shadow);
  position: relative;
  z-index: 10;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.app-title {
  display: flex;
  text-align: center; 
  align-items: center;
  font-size: 2.2rem;
  font-weight: 700;
  margin: 0;
  font-family: "Gill Sans", sans-serif;
  color: white;
}

.app-title .icon {
  margin-right: 12px;
  font-size: 1.5em;
}

/* Кнопка переключения режима */
.mode-toggle {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  transition: var(--transition);
  backdrop-filter: blur(5px);
}

.mode-toggle:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.mode-toggle.active {
  background: var(--accent);
  color: white;
}

.mode-toggle .icon {
  margin-right: 8px;
}

/* Подсказка для режима разметки */
.marker-guide {
  background: rgba(0, 0, 0, 0.2);
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  margin-top: 0.5rem;
  display: inline-block;
  font-size: 0.9rem;
  backdrop-filter: blur(5px);
}

/* Основное содержимое */
.gallery-main {
  flex: 1;
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.gallery-frame {
  background-color: white;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
  width: 100%;
  max-width: 1200px;
  position: relative;
  overflow: hidden;
}

/* Область просмотра изображения */
.image-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 60vh;
}

.image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: calc(var(--border-radius) - 5px);
  background-color: #f0f2f5;
}

/* Основное изображение */
.image-wrapper img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 70vh;
  object-fit: contain;
  margin: 0 auto;
  transition: transform 0.3s ease;
  cursor: crosshair;
}

.image-wrapper img.marker-mode {
  cursor: crosshair;
}

/* Элементы разметки */
.item-area {
  position: absolute;
  border: 2px dashed var(--accent);
  cursor: pointer;
  transition: var(--transition);
  z-index: 10;
}

.item-area:hover {
  background: rgba(72, 149, 239, 0.5);
  border-radius: 16px;
  opacity: 0.8; 
}

.placement-marker {
  position: absolute;
  width: 12px;
  height: 12px;
  background: var(--danger);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 20;
  box-shadow: 0 0 0 2px white;
}

.temp-area {
  position: absolute;
  background: rgba(247, 37, 133, 0.3);
  border: 2px solid var(--danger);
  z-index: 15;
}

/* Координаты */
.coordinates {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  font-size: 0.9rem;
  display: flex;
  gap: 1rem;
  backdrop-filter: blur(5px);
}

.coord {
  display: flex;
  align-items: center;
}

.coord:before {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}

.coord-x:before {
  background-color: #ff6b6b;
}

.coord-y:before {
  background-color: #4cc9f0;
}

/* Состояние загрузки */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: var(--gray);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(67, 97, 238, 0.2);
  border-radius: 50%;
  border-top-color: var(--primary);
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Подвал */
.gallery-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: white;
  border-top: 1px solid #e9ecef;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

/* Кнопки навигации */
.nav-button {
  background: white;
  border: 1px solid #dee2e6;
  color: var(--dark);
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  transition: var(--transition);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.nav-button:hover {
  background: #f8f9fa;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.nav-button .icon {
  margin: 0 8px;
  font-size: 1.1em;
}

/* Кнопка сохранения */
.save-button {
  background: var(--success);
  border: none;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  transition: var(--transition);
  box-shadow: 0 2px 10px rgba(76, 201, 240, 0.3);
}

.save-button:hover {
  background: #3db9e0;
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 4px 15px rgba(76, 201, 240, 0.4);
}

.save-button .icon {
  margin-right: 8px;
}

/* Анимации */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.tooltip-content {
  padding: 0 1rem 0 1rem;
}

/* Адаптивность */
@media (max-width: 768px) {
  .app-header {
    padding: 1rem;
  }
  
  .app-title {
    font-size: 1.4rem;
  }
  
  .mode-toggle {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
  
  .gallery-main {
    padding: 1rem;
  }
  
  .gallery-footer {
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
    padding: 1rem;
  }
  
  .nav-button, .save-button {
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
  }
}
</style>