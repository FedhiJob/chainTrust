"use client";

import Image from "next/image";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CloseButton,
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerPositioner,
  DrawerRoot,
  DrawerTitle,
  Flex,
  HStack,
  IconButton,
  Link,
  Text,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import { HamburgerIcon } from "@chakra-ui/icons";
import { ToastProvider } from "@/components/toast";
import { useAuth } from "@/lib/use-auth";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { open, onOpen, onClose, setOpen } = useDisclosure();
  const { user } = useAuth();

  const hideChrome =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/verify");
  const showChrome = mounted && !hideChrome;

  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = useMemo(() => {
    if (!user) return [];
    const links = [{ label: "Dashboard", href: "/dashboard" }];

    if (user.role === "admin" || user.role === "distributor") {
      links.push({ label: "Batches", href: "/batches" });
    }

    if (user.role === "distributor") {
      links.push({ label: "Transfers", href: "/transfers/create" });
    }

    links.push({ label: "History", href: "/history" });

    return links;
  }, [user]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <ToastProvider>
      {showChrome ? (
        <Box minH="100vh" display="flex" flexDirection="column">
          <Box
            as="header"
            borderBottom="1px solid"
            borderColor="var(--border)"
            bg="var(--surface)"
            backdropFilter="blur(10px)"
          >
            <Flex
              maxW="6xl"
              mx="auto"
              px={{ base: 4, md: 6 }}
              py={{ base: 4, md: 4 }}
              align="center"
              justify="space-between"
              gap={4}
            >
              <HStack spacing={3} align="center">
                <Image src="/logo.png" alt="ChainTrust logo" width={36} height={36} />
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="var(--foreground)">
                    ChainTrust
                  </Text>
                  <Text fontSize="xs" color="var(--muted)">
                    Trust infrastructure for physical goods
                  </Text>
                </Box>
              </HStack>

              <HStack
                spacing={4}
                display={{ base: "none", md: "flex" }}
                color="var(--muted)"
                fontSize="sm"
                fontWeight="500"
              >
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    as={NextLink}
                    href={link.href}
                    px={3}
                    py={1}
                    borderRadius="999px"
                    _hover={{ color: "var(--foreground)" }}
                  >
                    {link.label}
                  </Link>
                ))}
              </HStack>

              <HStack spacing={3} display={{ base: "none", md: "flex" }}>
                {user ? (
                  <Box
                    border="1px solid"
                    borderColor="var(--border)"
                    px={3}
                    py={1}
                    borderRadius="999px"
                    fontSize="xs"
                    color="var(--muted)"
                  >
                    {user.fullName} · {user.role}
                  </Box>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  borderRadius="999px"
                  borderColor="var(--border)"
                  bg="white"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </HStack>

              <IconButton
                aria-label="Open menu"
                icon={<HamburgerIcon />}
                variant="outline"
                borderColor="var(--border)"
                display={{ base: "inline-flex", md: "none" }}
                onClick={onOpen}
              />
            </Flex>
          </Box>

          <DrawerRoot
            open={open}
            onOpenChange={(details) => setOpen(details.open)}
            placement="end"
          >
            <DrawerBackdrop />
            <DrawerPositioner>
              <DrawerContent>
                <DrawerHeader
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <DrawerTitle>Menu</DrawerTitle>
                  <DrawerCloseTrigger asChild>
                    <CloseButton />
                  </DrawerCloseTrigger>
                </DrawerHeader>
                <DrawerBody>
                  <VStack align="stretch" spacing={4} mt={4}>
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        as={NextLink}
                        href={link.href}
                        fontWeight="600"
                        onClick={onClose}
                      >
                        {link.label}
                      </Link>
                    ))}
                    {user ? (
                      <Box
                        border="1px solid"
                        borderColor="var(--border)"
                        px={3}
                        py={2}
                        borderRadius="lg"
                        fontSize="sm"
                        color="var(--muted)"
                      >
                        {user.fullName} · {user.role}
                      </Box>
                    ) : null}
                    <Button
                      variant="outline"
                      borderColor="var(--border)"
                      onClick={handleLogout}
                    >
                      Logout
                    </Button>
                  </VStack>
                </DrawerBody>
              </DrawerContent>
            </DrawerPositioner>
          </DrawerRoot>

          <Box as="main" flex="1">
            {children}
          </Box>

          <Box
            as="footer"
            borderTop="1px solid"
            borderColor="var(--border)"
            bg="var(--surface)"
          >
            <Flex
              maxW="6xl"
              mx="auto"
              px={{ base: 4, md: 6 }}
              py={6}
              direction={{ base: "column", md: "row" }}
              align={{ base: "flex-start", md: "center" }}
              justify="space-between"
              gap={2}
              fontSize="sm"
              color="var(--muted)"
            >
              <Text>ChainTrust is a digital accountability layer for institutional transfers.</Text>
              <Text>© 2026 ChainTrust. All rights reserved.</Text>
            </Flex>
          </Box>
        </Box>
      ) : (
        <main className="min-h-screen">{children}</main>
      )}
    </ToastProvider>
  );
}
