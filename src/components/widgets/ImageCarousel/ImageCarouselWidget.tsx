import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { ChevronLeft, ChevronRight, Image as ImageIcon, FolderOpen } from 'lucide-react';
import { getEntry } from '../../../utils/fileManagerDb';
import { requestOpenFile } from '../../../utils/openDialog';
import { WidgetToolbar } from '../../core/WidgetToolbar';
import './ImageCarousel.css';

// El componente principal del carrusel de imágenes
export const ImageCarouselWidget: FC = () => {
  const { t } = useTranslation();
  const [images, setImages] = useLocalStorage<string[]>('image-carousel-images', []);
  const [currentIndex, setCurrentIndex] = useState(0);

  const loadFiles = (files: File[]) => {
    const imagePromises: Promise<string>[] = [];
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
      imagePromises.push(promise);
    });

    Promise.all(imagePromises).then(newImages => {
      setImages(newImages);
      setCurrentIndex(0);
    }).catch(error => {
      console.error('Error loading images:', error);
    });
  };

  const handleOpenImages = async () => {
    const result = await requestOpenFile({ accept: 'image/*', multiple: true });
    if (!result) return;
    if (result.source === 'local') {
      loadFiles(result.files);
      return;
    }
    const files: File[] = [];
    for (const entryId of result.entryIds) {
      const entry = await getEntry(entryId);
      if (!entry?.blob) continue;
      if (entry.mime && !entry.mime.startsWith('image/')) continue;
      files.push(new File([entry.blob], entry.name, { type: entry.mime || entry.blob.type }));
    }
    if (files.length > 0) loadFiles(files);
  };

  const goToPrevious = useCallback(() => {
    if (images.length <= 1) return;
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  }, [currentIndex, images.length]);

  const goToNext = useCallback(() => {
    if (images.length <= 1) return;
    const isLastSlide = currentIndex === images.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  }, [currentIndex, images.length]);

  // Navegación con teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (images.length === 0) return;
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, goToPrevious, goToNext]);

  // Debug: mostrar estado actual
  console.log('Current render state - images.length:', images.length, 'currentIndex:', currentIndex);

  return (
    <div className="image-carousel-widget">
      <WidgetToolbar>
        <button
          type="button"
          onClick={handleOpenImages}
          className="image-carousel-toolbar-button"
          title={t('widgets.image_carousel.select_new_images')}
        >
          <FolderOpen size={18} />
        </button>
      </WidgetToolbar>
      {images.length === 0 ? (
        // Vista cuando no hay imágenes cargadas
        <div className="placeholder-view">
          <ImageIcon size={64} className="text-gray-400" />
          <p className="mt-4 text-center">{t('widgets.image_carousel.no_images')}</p>
          <button onClick={handleOpenImages} className="upload-button">
            <FolderOpen size={18} />
            {t('widgets.image_carousel.select_images')}
          </button>
        </div>
      ) : (
        // Vista del carrusel
        <div className="carousel-view">
          <div className="carousel-image-container">
            <img src={images[currentIndex]} alt={t('widgets.image_carousel.slide_alt', { number: currentIndex + 1 })} />
            {/* Debug indicator */}
            <div style={{position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '5px', borderRadius: '3px'}}>
              {currentIndex + 1} / {images.length}
              {images.length === 1 && <div style={{fontSize: '12px', marginTop: '3px'}}>{t('widgets.image_carousel.more_images_hint')}</div>}
            </div>
          </div>
          
          {/* Controles de Navegación - Solo mostrar si hay más de 1 imagen */}
          {images.length > 1 && (
            <>
              <button className="carousel-arrow left-arrow" onClick={goToPrevious}><ChevronLeft size={32} /></button>
              <button className="carousel-arrow right-arrow" onClick={goToNext}><ChevronRight size={32} /></button>
            </>
          )}
          
          {/* Indicadores de Diapositiva - Solo mostrar si hay más de 1 imagen */}
          {images.length > 1 && (
            <div className="slide-indicators">
              {images.map((_, index) => (
                <div 
                  key={index}
                  className={`indicator-dot ${currentIndex === index ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>
          )}
          
        </div>
      )}
    </div>
  );
};

// Objeto de configuración del widget

export { widgetConfig } from './widgetConfig';
