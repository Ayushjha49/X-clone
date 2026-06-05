import { IoClose } from "react-icons/io5";

// Reusable lightbox for profile/cover image viewing
const ImageLightbox = ({ src, onClose }) => {
	if (!src) return null;
	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90'
			onClick={onClose}
		>
			<button
				className='absolute top-4 right-4 text-white hover:text-gray-300 z-10'
				onClick={onClose}
			>
				<IoClose className='w-8 h-8' />
			</button>
			<img
				src={src}
				className='max-h-screen max-w-screen-lg object-contain p-4'
				onClick={(e) => e.stopPropagation()}
				alt='fullscreen'
			/>
		</div>
	);
};

export default ImageLightbox;
