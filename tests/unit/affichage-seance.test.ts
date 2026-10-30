import { expect, test } from 'vitest';
import { lecteurVideo, surlignerPassage } from '../../src/lib/seance/affichage.ts';

test('surlignerPassage découpe le texte autour du passage, sans tenir compte de la casse ni des espaces', () => {
	expect(surlignerPassage('Le contact avec le filet est une faute.', 'EST UNE  faute')).toEqual([
		{ texte: 'Le contact avec le filet ', surligne: false },
		{ texte: 'est une faute', surligne: true },
		{ texte: '.', surligne: false }
	]);
});

test('sans passage ou passage absent : le texte entier, non surligné', () => {
	expect(surlignerPassage('Texte', null)).toEqual([{ texte: 'Texte', surligne: false }]);
	expect(surlignerPassage('Texte', 'absent')).toEqual([{ texte: 'Texte', surligne: false }]);
});

test('lecteurVideo reconnaît YouTube intégré, un fichier vidéo, ou un simple lien', () => {
	expect(lecteurVideo('https://www.youtube-nocookie.com/embed/abc123')).toEqual({ type: 'youtube', src: 'https://www.youtube-nocookie.com/embed/abc123' });
	expect(lecteurVideo('https://fivbacademy.com/cas.mp4')).toEqual({ type: 'fichier', src: 'https://fivbacademy.com/cas.mp4' });
	expect(lecteurVideo('https://exemple.org/page')).toEqual({ type: 'lien', src: 'https://exemple.org/page' });
	expect(lecteurVideo(null)).toBeNull();
});
