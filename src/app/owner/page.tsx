
'use client';

import { useState, useEffect, memo } from 'react';
import type { DentalCase, LoginLog, User } from '@/types';
import PageHeader from '@/components/page-header';
import CasesTable from '@/components/cases-table';
import Dashboard from '@/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { QrCode, Trash2, Receipt, History, X, Edit, Users, UserPlus, RefreshCw } from 'lucide-react';
import { getCases, deleteCase, updateCase, getLoginLogs, getUnreadNotifications, markNotificationAsRead, getUsers, addUser, updateUser, deleteUser, createNotification, getCaseById } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
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
import { isValid, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useForm, SubmitHandler } from 'react-hook-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const materialOptions = ["Zolid", "Zirconia", "Nickel Free", "N-Guard", "Implant", "MookUp"];

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

function LoginLogsDialog() {
    const [logs, setLogs] = useState<LoginLog[]>([]);
    const { toast } = useToast();
    const timeZone = 'Asia/Amman';

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
            return formatInTimeZone(date, timeZone, 'PPP p');
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
                            <TableHead>Doctor User</TableHead>
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

// --- User Management Components ---
type UserFormData = Omit<User, 'id'>;

function EditUserForm({ user, onUserUpdated, onCancel }: { user: User; onUserUpdated: () => void; onCancel: () => void; }) {
    const { register, handleSubmit, formState: { errors } } = useForm<UserFormData>({
        defaultValues: {
            name: user.name,
            password: '', // Password is not pre-filled for security
            welcomeMessage: user.welcomeMessage,
        },
    });
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const onSubmit: SubmitHandler<UserFormData> = async (data) => {
        setIsSaving(true);
        try {
            const updatedData: Partial<User> = { name: data.name, welcomeMessage: data.welcomeMessage };
            if (data.password) {
                updatedData.password = data.password;
            }
            await updateUser(user.id, updatedData);
            toast({ title: 'Success', description: 'User has been updated.' });
            onUserUpdated();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <Label htmlFor="name">Doctor User</Label>
                <Input id="name" {...register('name', { required: 'Name is required' })} />
                {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
                <Label htmlFor="password">New Password (optional)</Label>
                <Input id="password" type="password" {...register('password')} placeholder="Leave blank to keep unchanged" />
            </div>
            <div>
                <Label htmlFor="welcomeMessage">Welcome Message</Label>
                <Input id="welcomeMessage" {...register('welcomeMessage')} />
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
        </form>
    );
}

function AddUserForm({ onUserAdded, onCancel }: { onUserAdded: () => void; onCancel: () => void; }) {
    const { register, handleSubmit, formState: { errors } } = useForm<UserFormData>();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const onSubmit: SubmitHandler<UserFormData> = async (data) => {
        setIsSaving(true);
        try {
            await addUser(data);
            toast({ title: 'Success', description: 'New doctor has been added.' });
            onUserAdded();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <Label htmlFor="add-name">Doctor User</Label>
                <Input id="add-name" {...register('name', { required: 'Name is required' })} />
                {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
                <Label htmlFor="add-password">Password</Label>
                <Input id="add-password" type="password" {...register('password', { required: 'Password is required' })} />
                {errors.password && <p className="text-destructive text-sm mt-1">{errors.password.message}</p>}
            </div>
            <div>
                <Label htmlFor="add-welcomeMessage">Welcome Message (optional)</Label>
                <Input id="add-welcomeMessage" {...register('welcomeMessage')} placeholder="e.g. Welcome, Dr. Smith" />
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? 'Adding...' : 'Add Doctor'}</Button>
            </DialogFooter>
        </form>
    );
}

export default function OwnerPage() {
  const [cases, setCases] = useState<DentalCase[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [materialFilter, setMaterialFilter] = useState('all');
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<{ id: string; message: string; caseId?: string }[]>([]);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // User Management State
  const [users, setUsers] = useState<User[]>([]);
  const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const isEditUserOpen = !!userToEdit;


  const fetchUsers = async () => {
    try {
        const usersFromDb = await getUsers();
        setUsers(usersFromDb);
    } catch (error) {
        handleFirebaseError(error);
    }
  };

  useEffect(() => {
    if (isManageUsersOpen) {
        fetchUsers();
    }
  }, [isManageUsersOpen]);

  const handleUserAdded = () => {
      setIsAddUserOpen(false);
      fetchUsers();
  };

  const handleUserUpdated = () => {
      setUserToEdit(null);
      fetchUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    try {
        await deleteUser(userId);
        toast({ title: 'Success', description: 'User has been deleted.' });
        fetchUsers();
    } catch (error) {
        handleFirebaseError(error);
    }
  };


  useEffect(() => {
    setIsMounted(true);
    if (localStorage.getItem(AUTH_KEY) === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const fetchCases = async () => {
    try {
        const casesFromDb = await getCases();
        setCases(casesFromDb);
    } catch (error) {
        handleFirebaseError(error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
        if (typeof window !== 'undefined') {
            fetchCases();
        }
    }
  }, [isAuthenticated]);
  
  useEffect(() => {
    const checkForNotifications = async () => {
        if (isAuthenticated) {
            try {
                const unreadNotifications = await getUnreadNotifications('owner');
                const patientsToSkip = ["Abdullah Mishael", "Vyfv"];
                const filteredNotifications = unreadNotifications.filter(notif => {
                    const isDeletionRequest = notif.message.includes('has requested to delete the case for patient:');
                    if (!isDeletionRequest) {
                        return true; 
                    }
                    const patientName = notif.message.split(':').pop()?.trim();
                    return !patientsToSkip.some(p => patientName === p);
                });

                if (filteredNotifications.length > 0) {
                    setNotifications(filteredNotifications);
                }
            } catch (error) {
                console.error("Failed to check for owner notifications:", error);
            }
        }
    };
    if (isMounted) {
        checkForNotifications();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isMounted, cases]); // Also re-check when cases change


  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === APP_PASSWORD) {
      localStorage.setItem(AUTH_KEY, 'true');
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect password. Please try again.');
    }
  };


  const handleFirebaseError = (error: any) => {
    console.error("Firebase Error:", error);
    let description = 'An unexpected error occurred.';
    if (error.code === 'permission-denied' || (error.message && error.message.includes('permission-denied'))) {
        description = 'You have insufficient permissions to access the database. Please update your Firestore security rules in the Firebase console.';
    } else if (error.message) {
        description = error.message;
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
  
  const handleDeleteCase = async (caseToDelete: DentalCase) => {
    try {
      if (caseToDelete.dentistName === 'Dr.Ibraheem Omar') {
        // Soft delete for Dr. Ibraheem Omar
        await updateCase(caseToDelete.id, { isDeleted: true });
        toast({ title: "Case Hidden", description: "Case has been hidden from the owner view but remains in the doctor's backup." });
      } else {
        // Permanent delete for others
        await deleteCase(caseToDelete.id);
        toast({ title: "Success", description: "Case deleted successfully." });
      }
      fetchCases(); // Re-fetch cases to reflect the change
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

   const handleDeletionRequest = async (notifId: string, caseId: string | undefined, approve: boolean) => {
    if (!caseId) {
        toast({ variant: "destructive", title: "Error", description: "Notification is missing a case ID." });
        return;
    }

    const relatedCase = await getCaseById(caseId);

    if (!relatedCase) {
        toast({ variant: "destructive", title: "Error", description: "Could not find the related case." });
        return;
    }

    try {
        if (approve) {
            await updateCase(caseId, { isDeleted: true, deletionRequested: true }); // Keep deletionRequested true
            await createNotification(relatedCase.dentistName, `Your deletion request for case (${relatedCase.patientName}) was APPROVED.`);
            toast({ title: "Approved", description: "Case has been marked as deleted." });
        } else {
            await updateCase(caseId, { deletionRequested: false });
            await createNotification(relatedCase.dentistName, `Your deletion request for case (${relatedCase.patientName}) was DENIED.`);
            toast({ title: "Denied", description: "Case deletion request has been denied." });
        }
        
        await markNotificationAsRead(notifId);
        setNotifications(prev => prev.filter(n => n.id !== notifId));
        fetchCases(); // Refresh cases view to hide the soft-deleted case
    } catch (error) {
        handleFirebaseError(error);
    }
   };

   const handleNotificationAcknowledge = (notifId: string) => {
      markNotificationAsRead(notifId);
      setNotifications(prev => prev.filter(n => n.id !== notifId));
   };

  const handleDeleteSelectedCases = async () => {
    try {
      const casesToDelete = cases.filter(c => selectedCases.includes(c.id));
      const deletePromises = casesToDelete.map(c => {
        if (c.dentistName === 'Dr.Ibraheem Omar') {
          return updateCase(c.id, { isDeleted: true }); // Soft delete
        } else {
          return deleteCase(c.id); // Hard delete
        }
      });
      await Promise.all(deletePromises);

      toast({
        title: 'Cases Action Completed',
        description: `${selectedCases.length} selected case(s) have been processed.`,
      });
      fetchCases(); // Refresh cases from DB
      setSelectedCases([]); // Clear selection
    } catch (error) {
      handleFirebaseError(error);
    }
  };

  const filteredCases = cases.filter(c => {
    // Hide soft-deleted cases from owner view by default
    if (c.isDeleted) return false;

    const searchMatch = c.dentistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.patientName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const materialMatch = materialFilter !== 'all' ? c.material.includes(materialFilter) : true;

    return searchMatch && materialMatch;
  });

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
                        {authError && <p className="text-sm text-destructive">{authError}</p>}
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
    <>
      <AlertDialog open={notifications.length > 0} onOpenChange={(open) => !open && setNotifications([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You have {notifications.length} new notification(s)</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="list-disc pl-5 space-y-2 mt-2 max-h-60 overflow-y-auto pr-4">
              {notifications.map(notif => (
                <div key={notif.id} className="font-bold text-foreground py-2 border-b last:border-b-0">
                  <p>{notif.message}</p>
                  {notif.message.includes("delete") && notif.caseId ? (
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" onClick={() => handleDeletionRequest(notif.id, notif.caseId, true)}>
                        Yes, Delete
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeletionRequest(notif.id, notif.caseId, false)}>
                        No, Keep
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-2">
                    </div>
                  )}
                </div>
              ))}
            </div>
          <AlertDialogFooter>
             <AlertDialogAction onClick={() => {
                 notifications.forEach(notif => {
                    if (!notif.message.includes("delete")) {
                        handleNotificationAcknowledge(notif.id);
                    }
                 });
                 setNotifications(prev => prev.filter(n => n.message.includes("delete")));
             }}>
                Got It
              </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    
      {/* User Management Dialog */}
      <Dialog open={isManageUsersOpen} onOpenChange={setIsManageUsersOpen}>
          <DialogContent className="max-w-3xl">
              <DialogHeader>
                  <DialogTitle>Manage Users</DialogTitle>
                  <DialogDescription>Add, edit, or delete doctor accounts.</DialogDescription>
              </DialogHeader>
              <div className="my-4">
                  <Button onClick={() => setIsAddUserOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" /> Add New Doctor
                  </Button>
              </div>
              <div className="rounded-md border max-h-[50vh] overflow-y-auto">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Doctor User</TableHead>
                              <TableHead>Password</TableHead>
                              <TableHead>Welcome Message</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {users.map((user) => (
                              <TableRow key={user.id}>
                                  <TableCell className="font-medium">{user.name}</TableCell>
                                  <TableCell>{user.password}</TableCell>
                                  <TableCell>{user.welcomeMessage}</TableCell>
                                  <TableCell className="text-right">
                                      <Button variant="ghost" size="icon" onClick={() => setUserToEdit(user)}>
                                          <Edit className="h-4 w-4" />
                                      </Button>
                                      <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                              <Button variant="ghost" size="icon">
                                                  <Trash2 className="h-4 w-4 text-destructive" />
                                              </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                              <AlertDialogHeader>
                                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                  <AlertDialogDescription>This will permanently delete {user.name}'s account.</AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                  <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                              </AlertDialogFooter>
                                          </AlertDialogContent>
                                      </AlertDialog>
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </div>
          </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Add New Doctor</DialogTitle>
              </DialogHeader>
              <AddUserForm onUserAdded={handleUserAdded} onCancel={() => setIsAddUserOpen(false)} />
          </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={(isOpen) => !isOpen && setUserToEdit(null)}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Edit User: {userToEdit?.name}</DialogTitle>
              </DialogHeader>
              {userToEdit && <EditUserForm user={userToEdit} onUserUpdated={handleUserUpdated} onCancel={() => setUserToEdit(null)} />}
          </DialogContent>
      </Dialog>


      <div className="min-h-screen bg-background text-foreground">
        <PageHeader cases={cases} setCases={setCases} onReload={fetchCases} />
        <main className="p-4 sm:p-6 lg:p-8 space-y-6">
          <Dashboard cases={filteredCases} />
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                      <CardTitle className="flex items-center gap-2 font-headline">
                          <ToothIcon className="w-6 h-6 text-primary" />
                          All Recorded Cases
                      </CardTitle>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex flex-col gap-2 items-start">
                      <div className="flex items-center gap-2">
                          <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <Button 
                                      variant="destructive"
                                      size="sm"
                                      disabled={selectedCases.length === 0}
                                  >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete ({selectedCases.length})
                                  </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          This action cannot be undone. This will permanently delete {selectedCases.length} selected case(s). Cases for Dr.Ibraheem Omar will be hidden from this view but remain in his backup.
                                      </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={handleDeleteSelectedCases} className="bg-destructive hover:bg-destructive/90">
                                          Yes, process
                                      </AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
                          <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <History className="mr-2 h-4 w-4" />
                                    Logs
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <LoginLogsDialog />
                            </DialogContent>
                          </Dialog>
                          <Button asChild variant="outline" size="sm">
                            <Link href="/owner/invoice">
                              <Receipt className="mr-2 h-4 w-4" />
                              Invoices
                            </Link>
                          </Button>
                      </div>
                       <div className="flex items-center gap-2">
                           <Button asChild variant="outline" size="sm">
                            <Link href="/owner/qr">
                              <QrCode className="mr-2 h-4 w-4" />
                              QR Code
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setIsManageUsersOpen(true)}>
                              <Users className="mr-2 h-4 w-4" />
                              Manage Users
                          </Button>
                       </div>
                    </div>

                     <div className="flex items-center gap-2 sm:ml-auto">
                      <Input 
                          placeholder="Search by dentist or patient..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="max-w-xs"
                      />
                      <Select value={materialFilter} onValueChange={setMaterialFilter}>
                          <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Filter by material..." />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">All Materials</SelectItem>
                              {materialOptions.map(material => (
                                  <SelectItem key={material} value={material}>
                                      {material}
                                  </SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                   </div>
                  </div>
              </div>
            </CardHeader>
            <CardContent>
              <CasesTable 
                  cases={filteredCases} 
                  onDeleteCase={handleDeleteCase} 
                  onUpdateCase={handleUpdateCase}
                  selectedCases={selectedCases}
                  onSelectedCasesChange={setSelectedCases}
                  showSerialNumber={true}
              />
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}
