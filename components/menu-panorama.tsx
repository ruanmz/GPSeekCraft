const PANORAMA = Array.from({ length: 6 }, (_, index) =>
  `/assets/minecraft/textures/gui/title/background/panorama_${index}.png`,
)

export function MenuPanorama() {
  return (
    <div className="mc-panorama" aria-hidden="true">
      <div className="mc-panorama-track">
        {[...PANORAMA, ...PANORAMA].map((src, index) => (
          <img key={`${src}-${index}`} src={src} alt="" draggable={false} />
        ))}
      </div>
      <div className="mc-panorama-shade" />
    </div>
  )
}
