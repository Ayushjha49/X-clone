import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";

import XSvg from "../../components/svgs/X.jsx";

import { MdOutlineMail } from "react-icons/md";
import { MdPassword } from "react-icons/md";
import { FcGoogle } from "react-icons/fc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const LoginPage = () => {
	const [formData, setFormData] = useState({
		username: "",
		password: "",
	});
	const queryClient = useQueryClient();
	const [searchParams] = useSearchParams();

	// Show error toast if redirected back from failed OAuth
	useEffect(() => {
		if (searchParams.get("error") === "oauth_failed") {
			toast.error("Google sign-in failed. Please try again.");
		}
	}, [searchParams]);

	const { mutate: loginMutation, isPending, isError, error } = useMutation({
		mutationFn: async ({ username, password }) => {
			try {
				const res = await fetch("/api/auth/login", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ username, password }),
				});
				const data = await res.json();
				if (!res.ok) throw new Error(data.error || "Something went wrong");
				return data;
			} catch (error) {
				throw new Error(error);
			}
		},
		onSuccess: () => {
			toast.success("Login successful");
			queryClient.invalidateQueries({ queryKey: ["authUser"] });
		},
	});

	const handleSubmit = (e) => {
		e.preventDefault();
		loginMutation(formData);
	};

	const handleInputChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleGoogleLogin = () => {
		window.location.href = "/api/auth/google";
	};

	return (
		<div className='max-w-screen-xl mx-auto flex h-screen'>
			<div className='flex-1 hidden lg:flex items-center justify-center'>
				<XSvg className='lg:w-2/3 fill-current' />
			</div>
			<div className='flex-1 flex flex-col justify-center items-center'>
				<form className='flex gap-4 flex-col' onSubmit={handleSubmit}>
					<XSvg className='w-24 lg:hidden fill-current' />
					<h1 className='text-4xl font-extrabold'>{"Let's"} go.</h1>
					<label className='input input-bordered rounded flex items-center gap-2'>
						<MdOutlineMail />
						<input
							type='text'
							className='grow'
							placeholder='username'
							name='username'
							onChange={handleInputChange}
							value={formData.username}
						/>
					</label>
					<label className='input input-bordered rounded flex items-center gap-2'>
						<MdPassword />
						<input
							type='password'
							className='grow'
							placeholder='Password'
							name='password'
							onChange={handleInputChange}
							value={formData.password}
						/>
					</label>
					<button className='btn rounded-full btn-primary text-white'>
						{isPending ? "Loading..." : "Login"}
					</button>
					{isError && <p className='text-red-500'>{error.message}</p>}
				</form>

				<div className='flex flex-col gap-2 mt-4 w-full max-w-xs'>
					<div className='divider text-base-content/40 text-sm'>or</div>
					<button
						onClick={handleGoogleLogin}
						className='btn btn-outline rounded-full w-full flex gap-2 items-center'
					>
						<FcGoogle className='w-5 h-5' />
						Sign in with Google
					</button>
				</div>

				<div className='flex flex-col gap-2 mt-4'>
					<p className='text-lg'>{"Don't"} have an account?</p>
					<Link to='/signup'>
						<button className='btn rounded-full btn-primary text-white btn-outline w-full'>Sign up</button>
					</Link>
				</div>
			</div>
		</div>
	);
};
export default LoginPage;
