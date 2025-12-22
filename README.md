# Reproductor de Video Accesible con Able Player

Implementación del reproductor de video accesible [Able Player](https://ableplayer.github.io/ableplayer/) siguiendo las especificaciones de [TOTHOMweb](https://ableplayer.tothomweb.dev/).

## 🎯 Características

- ✅ **Subtítulos accesibles**: Verbalizados automáticamente por lectores de pantalla (NVDA, JAWS, VoiceOver)
- ✅ **Múltiples idiomas**: Español e inglés con cambio dinámico
- ✅ **Navegación por capítulos**: Marcadores para saltar entre secciones
- ✅ **Controles de teclado**: Completamente accesible sin mouse
- ✅ **Cumplimiento WCAG 2.1 AA**: Estándares de accesibilidad web

## 📁 Estructura del Proyecto

```
├── index.html                  # Página principal
├── build/                      # Archivos Able Player
│   ├── ableplayer.min.css
│   └── ableplayer.min.js
├── button-icons/               # Iconos del reproductor
├── translations/               # Traducciones (es, ca, oc)
├── custom-player.css           # Estilos personalizados TOTHOMweb
├── custom-player.js            # Funcionalidades personalizadas TOTHOMweb
├── wwa_captions_es.vtt        # Subtítulos en español
├── wwa_captions_en.vtt        # Subtítulos en inglés
└── wwa_chapters_es.vtt        # Capítulos en español
```

## 🚀 Uso Local

1. Iniciar servidor local:
```bash
python -m http.server 8000
```

2. Abrir en navegador:
```
http://localhost:8000/index.html
```

## 🌐 GitHub Pages

Este proyecto está configurado para funcionar en GitHub Pages. Todos los archivos necesarios están incluidos localmente (build/, button-icons/, translations/).

## 📚 Basado en TOTHOMweb

Esta implementación sigue exactamente las especificaciones del [Ejemplo 4 de TOTHOMweb](https://ableplayer.tothomweb.dev/pages/implementacio-hc.html), que incluye:

- Archivos `custom-player.js` y `custom-player.css` de TOTHOMweb
- Configuración optimizada para lectores de pantalla
- Actualización dinámica del atributo `lang` en subtítulos

## ⌨️ Controles de Teclado

| Tecla | Acción |
|-------|--------|
| `Espacio` o `P` | Reproducir/Pausar |
| `R` | Reiniciar video |
| `←` | Retroceder 10 segundos |
| `→` | Avanzar 10 segundos |
| `↑` | Subir volumen |
| `↓` | Bajar volumen |
| `M` | Silenciar/Activar sonido |
| `C` | Activar/Desactivar subtítulos |
| `D` | Activar/Desactivar audiodescripción |
| `F` | Pantalla completa |
| `T` | Mostrar/Ocultar transcripción |

## 🔧 Tecnologías

- [Able Player](https://ableplayer.github.io/ableplayer/) v4.3.65
- jQuery 3.2.1
- js-cookie 3.0.1
- WebVTT (subtítulos y capítulos)
- Personalizaciones TOTHOMweb v1.0.5

## 📄 Licencia

Able Player es de código abierto bajo licencia MIT.
