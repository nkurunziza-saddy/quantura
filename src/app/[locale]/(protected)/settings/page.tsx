import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentSession } from "@/server/actions/auth-actions";
import { getBusinessById } from "@/server/actions/business-actions";
import { getUserById } from "@/server/actions/user-actions";
import UserProfileForm from "@/components/forms/user-profile-form";
import { EditBusinessDetails } from "./_components/edit-business-details";
import { EditBusinessSettings } from "./_components/edit-business-settings";
import { EditCategories } from "./_components/edit-categories";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Building2,
  User,
  Settings,
  Tags,
  Warehouse,
  CreditCard,
  Bell,
  Shield,
} from "lucide-react";
import { EditWarehouses } from "./_components/edit-warehouses";
import { ConnectStripe } from "./_components/connect-stripe";
import { UserSettingsForm } from "@/components/forms/user-settings-form";
import { Separator } from "@/components/ui/separator";

export default async function SettingsPage() {
  const session = await getCurrentSession();
  const businessId = session?.user.businessId;
  const userId = session?.user.id;

  if (!businessId || !userId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Business or user not found. Please check your session.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const tabConfig = [
    {
      section: "Business",
      icon: Building2,
      tabs: [
        {
          value: "business-details",
          label: "Business Details",
          icon: Building2,
        },
        {
          value: "business-settings",
          label: "Business Settings",
          icon: Settings,
        },
        { value: "categories", label: "Categories", icon: Tags },
        { value: "warehouses", label: "Warehouses", icon: Warehouse },
        { value: "stripe", label: "Payments", icon: CreditCard },
      ],
    },
    {
      section: "Account",
      icon: User,
      tabs: [
        { value: "user-details", label: "Profile", icon: User },
        { value: "user-settings", label: "Preferences", icon: Settings },
        {
          value: "notifications",
          label: "Notifications",
          icon: Bell,
          disabled: true,
        },
        { value: "security", label: "Security", icon: Shield, disabled: true },
      ],
    },
  ];

  const [businessRes, userRes] = await Promise.all([
    getBusinessById(businessId),
    getUserById(userId),
  ]);

  const business = businessRes.data;
  const user = userRes.data;

  if (!business) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Business data is not available. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="font-medium tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your business and account preferences
          </p>
        </div>

        <Tabs
          defaultValue="business-details"
          orientation="vertical"
          className="w-full flex-row gap-6"
        >
          <div className="w-60 flex-shrink-0">
            <div className="sticky top-6">
              <TabsList className="flex flex-col gap-1 h-auto w-full bg-transparent border shadow-sm p-1">
                {tabConfig.map((section, sectionIndex) => (
                  <div key={section.section} className="w-full">
                    {sectionIndex > 0 && <Separator className="my-1" />}

                    <div className="px-2 py-1 border-b mb-2">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        {/* <section.icon className="h-3.5 w-3.5" /> */}
                        {section.section}
                      </h3>
                    </div>

                    <div className="space-y-1">
                      {section.tabs.map((tab) => (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          disabled={tab.disabled}
                          className="w-full justify-start text-sm font-medium"
                        >
                          {/* <tab.icon className="h-4 w-4 flex-shrink-0" /> */}
                          <span className="truncate">{tab.label}</span>
                        </TabsTrigger>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsList>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <TabsContent value="business-details" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>Business Details</CardTitle>
                  <CardDescription>
                    Update your business information and branding
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EditBusinessDetails
                    business={{
                      businessType: business?.businessType || "",
                      domain: business?.domain || "",
                      id: business?.id || "",
                      isActive: business?.isActive || false,
                      logoUrl: business?.logoUrl || "",
                      name: business?.name || "",
                      registrationNumber: business?.registrationNumber || "",
                    }}
                    businessTypes={[
                      { value: "corporation", label: "Corporation" },
                      {
                        value: "llc",
                        label: "Limited Liability Company (LLC)",
                      },
                      { value: "partnership", label: "Partnership" },
                      {
                        value: "sole_proprietorship",
                        label: "Sole Proprietorship",
                      },
                      { value: "nonprofit", label: "Non-Profit Organization" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="business-settings" className="m-0">
              <Card>
                <CardContent>
                  <EditBusinessSettings settings={business.businessSettings} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="categories" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>Categories</CardTitle>
                  <CardDescription>
                    Manage product and service categories
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EditCategories categories={business.categories} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="warehouses" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>Warehouses</CardTitle>
                  <CardDescription>
                    Manage your warehouse locations and inventory
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EditWarehouses warehouses={business.warehouses} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stripe" className="m-0">
              <Card>
                <CardContent>
                  <ConnectStripe
                    stripeAccountId={business.stripeAccountId ?? undefined}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="user-details" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Details</CardTitle>
                  <CardDescription>
                    Update your personal information and profile
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UserProfileForm user={user} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="user-settings" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>User Settings</CardTitle>
                  <CardDescription>
                    Configure your account preferences and notifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UserSettingsForm />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>
                    Manage how and when you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Order Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified about order status changes
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Inventory Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Low stock and inventory warnings
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>System Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          Platform updates and maintenance notices
                        </p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Marketing Emails</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive promotional content and newsletters
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                  <Button>Update Notifications</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your account security and authentication
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Password</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Last changed 30 days ago
                      </p>
                      <Button variant="outline" size="sm">
                        Change Password
                      </Button>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">
                        Two-Factor Authentication
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Add an extra layer of security to your account
                      </p>
                      <Button variant="outline" size="sm">
                        Enable 2FA
                      </Button>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Active Sessions</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Manage your active login sessions across devices
                      </p>
                      <Button variant="outline" size="sm">
                        View Sessions
                      </Button>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Login History</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Review recent login activity
                      </p>
                      <Button variant="outline" size="sm">
                        View History
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
