import { ImagePlus, Sparkles, Trash2 } from 'lucide-react';

export default function ArtistBanner({ image, onImageChange, greeting }) {
  const handleFile = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const source = new Image();
      source.onload = () => {
        const scale = Math.min(1, 1000 / source.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(source.width * scale);
        canvas.height = Math.round(source.height * scale);
        canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        onImageChange(outputType === 'image/png'
          ? canvas.toDataURL(outputType)
          : canvas.toDataURL(outputType, 0.82));
      };
      source.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };
  return <section className={`artist-banner ${image ? 'has-image' : ''}`}>
    <div className="banner-copy">
      <span className="eyebrow">YOUR PERSONAL TEXT LIBRARY</span>
      <h1>{greeting}<Sparkles size={21} /></h1>
      <p>All your go-to words, ready when you are.</p>
    </div>
    <div className="banner-art" aria-label="Personal artist banner">
      {image ? <img src={image} alt="Your chosen artist banner" /> : <div className="banner-placeholder"><span>✦</span><small>Your favorite artist goes here</small></div>}
      <label className="banner-edit" title="Change banner image"><ImagePlus size={14}/><span>{image ? 'Change photo' : 'Add artist photo'}</span><input type="file" accept="image/*" onChange={handleFile}/></label>
      {image && <button className="banner-remove" type="button" title="Remove banner image" aria-label="Remove banner image" onClick={() => onImageChange('')}><Trash2 size={14}/></button>}
    </div>
    <span className="banner-doodle doodle-heart">♡</span><span className="banner-doodle doodle-star">✦</span>
  </section>;
}
