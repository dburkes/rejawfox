#!/bin/perl

while (<STDIN>) {
  if (/em:version=\"([\d\.a-z]+)\"/) {
    print $1;
  }
}
