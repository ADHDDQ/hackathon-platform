import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ClientWorkspace from './pages/ClientWorkspace';
import Chatbot from './pages/Chatbot';
import Insights from './pages/Insights';
import { ClientProvider } from './context/ClientContext';

export default function App() {
	return (
		<ClientProvider>
			<div className="flex h-screen overflow-hidden bg-background text-foreground">
				<Sidebar />
				<div className="flex flex-1 flex-col overflow-hidden">
					<TopBar />
					<main className="flex-1 overflow-y-auto px-6 py-6">
						<Routes>
							<Route path="/" element={<ClientWorkspace />} />
							<Route path="/chatbot" element={<Chatbot />} />
							<Route path="/insights" element={<Insights />} />
							<Route path="*" element={<Navigate to="/" replace />} />
						</Routes>
					</main>
				</div>
			</div>
		</ClientProvider>
	);
}
