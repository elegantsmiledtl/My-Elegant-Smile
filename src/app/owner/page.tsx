
'use client';

import { useState, useEffect } from 'react';
import type { DentalCase, LoginLog } from '@/types';
import PageHeader from '@/components/page-header';
import CasesTable from '@/components/cases-table';
import Dashboard from '@/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { QrCode, Users, Trash2, PlusCircle, Receipt, History } from 'lucide-react';
import { getCases, deleteCase, updateCase, getUsers, deleteUser, addUser, getLoginLogs } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogClose } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import Logo from '@/components/logo';
import { format, parseISO, isValid } from 'date-fns';


const ToothIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9.34 2.126a3.5 3.5 0 0 1 5.32 0l.223.245a3.5 3.5 0 0 1 .53 4.28l-1.22 2.032a2 2 0 0 0-.28 1.634l.394 2.368a2 2 0 0 1-1.033 2.29l-1.575.908a2 2 0 0 1-2.228 0l-1.574-.908a2 2 0 0 1-1.033-2.29l.394-2.368a2 2 0 0 0-.28-1.634L7.4 6.65a3.5 3.5 0 0 1 .53-4.28l.223-.245Z" />
    <path d="M20 12l-1.55 4.34a2 2 0 0 1-1.8 1.36h-9.3a2 2 0 0 1-1.8-1.36L4 12" />
    <path d="M16 18a4 4 0 0 0-8 0" />
  </svg>
);

const APP_PASSWORD = "Ahmad0903"; 
const AUTH_KEY = "owner_app_auth";

// A simple form component for adding a doctor
function AddDoctorForm({ onDoctorAdded }: { onDoctorAdded: () => void }) {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !password) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please provide both user name and password.',
            });
            return;
        }
        try {
            await addUser({ name, password });
            toast({
                title: 'Success',
                description: `Doctor "${name}" has been added.`,
            });
            setName('');
            setPassword('');
            onDoctorAdded();
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to add doctor. They may already exist.',
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                    User Name
                </Label>
                <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="col-span-3"
                />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password-add" className="text-right">
                    Password
                </Label>
                <Input
                    id="password-add"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="col-span-3"
                />
            </div>
            <DialogClose asChild>
                <Button type="submit">Add Doctor</Button>
            </DialogClose>
        </form>
    );
}

function LoginLogsDialog() {
    const [logs, setLogs] = useState<LoginLog[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const fetchedLogs = await getLoginLogs();
                setLogs(fetchedLogs);
            } catch (error) {
                console.error("Firebase Error:", error);
                toast({
                    variant: 'destructive',
                    title: 'Database Error',
                    description: 'Could not fetch login logs.',
                });
            }
        };
        fetchLogs();
    }, [toast]);

    const formatDateTime = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (!isValid(date)) return "Invalid Date";
        try {
            return format(date, 'PPP p');
        } catch(e) {
            return "Invalid Date";
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>User Login History</DialogTitle>
                <DialogDescription>
                    This is a list of all successful logins to the doctor portal.
                </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border mt-4 max-h-[60vh] overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User Name</TableHead>
                            <TableHead>Login Time</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell className="font-medium">{log.dentistName}</TableCell>
                                <TableCell>{formatDateTime(log.timestamp)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </DialogContent>
    );
}


export default function OwnerPage() {
  const [cases, setCases] = useState<DentalCase[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const [isUsersDialogOpen, setIsUsersDialogOpen] = useState(false);
  const [isAddDoctorDialogOpen, setIsAddDoctorDialogOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setIsMounted(true);
    if (localStorage.getItem(AUTH_KEY) === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
        if (typeof window !== 'undefined') {
            fetchCases();
            fetchUsers();
        }
    }
  }, [isAuthenticated]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === APP_PASSWORD) {
      localStorage.setItem(AUTH_KEY, 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
    }
  };


  const handleFirebaseError = (error: any) => {
    console.error("Firebase Error:", error);
    let description = 'An unexpected error occurred.';
    if (error.code === 'permission-denied' || error.message.includes('permission-denied')) {
        description = 'You have insufficient permissions to access the database. Please update your Firestore security rules in the Firebase console.';
    }
    toast({
        variant: 'destructive',
        title: 'Database Error',
        description: description,
        action: description.includes('insufficient permissions') ? (
            <a href="https://console.firebase.google.com/project/elegant-smile-r6jex/firestore/rules" target="_blank" rel="noopener noreferrer">
                <Button variant="secondary">Fix Rules</Button>
            </a>
        ) : undefined,
    });
  };

  const fetchCases = async () => {
    try {
        const casesFromDb = await getCases();
        setCases(casesFromDb);
    } catch (error) {
        handleFirebaseError(error);
    }
  };

  const fetchUsers = async () => {
    try {
        const usersFromDb = await getUsers();
        setAllUsers(usersFromDb);
    } catch(error) {
        handleFirebaseError(error);
    }
  }

  const handleDoctorAdded = () => {
      fetchUsers();
      setIsAddDoctorDialogOpen(false);
  }

  const handleDeleteCase = async (id: string) => {
    try {
        await deleteCase(id);
        setCases(prevCases => prevCases.filter(c => c.id !== id));
        toast({ title: "Success", description: "Case deleted successfully." });
    } catch (error) {
        handleFirebaseError(error);
    }
  };
  
  const handleUpdateCase = async (updatedCase: DentalCase) => {
     try {
        await updateCase(updatedCase.id, updatedCase);
        setCases(prevCases => prevCases.map(c => c.id === updatedCase.id ? updatedCase : c));
        toast({ title: "Success", description: "Case updated successfully." });
    } catch (error) {
        handleFirebaseError(error);
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
        await deleteUser(userId);
        toast({
            title: 'Doctor Deleted',
            description: `The user has been deleted.`,
        });
        fetchUsers();
    } catch(error) {
        handleFirebaseError(error);
    }
  };

  const filteredCases = cases.filter(c => 
    c.dentistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.patientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isMounted) {
    return null;
  }
  
  if (!isAuthenticated) {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="absolute top-8 left-8">
                <Logo />
            </div>
            <Card className="w-full max-w-sm shadow-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl">Owner Dashboard Access</CardTitle>
                    <CardDescription>
                        Please enter the password to continue.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasswordSubmit} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                            />
                        </div>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        <Button type="submit" className="w-full">
                            Enter
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader cases={cases} setCases={setCases} />
      <main className="p-4 sm:p-6 lg:p-8 space-y-6">
        <Dashboard cases={filteredCases} />
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 font-headline">
                <ToothIcon className="w-6 h-6 text-primary" />
                All Recorded Cases
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                    <Dialog open={isUsersDialogOpen} onOpenChange={setIsUsersDialogOpen}>
                        <DialogTrigger asChild>
                             <Button variant="outline">
                                <Users className="mr-2" />
                                Manage Users
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>All Registered Users</DialogTitle>
                                 <DialogDescription>
                                    This is a list of all users who can log in to the doctor portal.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="rounded-md border mt-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                        <TableHead>User Name</TableHead>
                                        <TableHead>Password</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {allUsers.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell className="font-medium">{user.name}</TableCell>
                                                <TableCell>{user.password}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                             <Dialog open={isAddDoctorDialogOpen} onOpenChange={setIsAddDoctorDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="mt-4">
                                        <PlusCircle className="mr-2" />
                                        Add New Doctor
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add a New Doctor</DialogTitle>
                                        <DialogDescription>
                                            Create a new user account for the doctor portal.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <AddDoctorForm onDoctorAdded={handleDoctorAdded} />
                                </DialogContent>
                            </Dialog>
                        </DialogContent>
                    </Dialog>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <History className="mr-2" />
                                Logs
                            </Button>
                        </DialogTrigger>
                        <LoginLogsDialog />
                    </Dialog>
                     <Button asChild variant="outline">
                      <Link href="/owner/invoice">
                        <Receipt className="mr-2" />
                        Invoices
                      </Link>
                    </Button>
                     <Button asChild variant="outline">
                      <Link href="/owner/qr">
                        <QrCode className="mr-2" />
                        Doctor Portal QR Code
                      </Link>
                    </Button>
                </div>
                <div className="w-1/3">
                    <Input 
                        placeholder="Search by dentist or patient..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <CasesTable cases={filteredCases} onDeleteCase={handleDeleteCase} onUpdateCase={handleUpdateCase}/>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
