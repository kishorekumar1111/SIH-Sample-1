import React from 'react';

export default function Header() {
	return (
		<header className="bg-gray-800 border-b border-gray-700">
			<div className="container mx-auto px-4 py-4 flex items-center justify-between">
				<h1 className="text-2xl font-bold">EduMesh</h1>
				<nav className="text-sm text-gray-300">Offline-first PWA</nav>
			</div>
		</header>
	);
}
